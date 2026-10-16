import * as iam from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import {
  configurationSetName,
  INBOUND_PREFIX,
  inboundDomain,
  sesSendStatement,
} from '../lib/email';
import { keysOf, recordOf } from '../lib/record';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';
import { bucketArn, objectArns } from '../lib/s3-arns';
import { WorkerFunction } from '../lib/worker-function';
import { QUEUE_WORKERS, type QueueName, type QueueWorkerName } from '../lib/workers';
import type { JobQueues } from './queues-stack';
import type { Secrets } from './secrets-stack';

export interface WorkersStackProps extends RobesStackProps {
  secrets: Secrets;
  queues: JobQueues;
  workersEntryDir: string;
}

interface WorkerGrants {
  secrets: Record<string, ISecret>;
  sendTo: QueueName[];
  s3?: { actions: string[]; prefixes: string[] }[];
  listBucket?: boolean;
  sendEmail?: boolean;
}

const QUEUE_ENV: Record<QueueName, string> = {
  'jobs-interactive': 'JOBS_INTERACTIVE_QUEUE_URL',
  'jobs-batch': 'JOBS_BATCH_QUEUE_URL',
  fetch: 'FETCH_QUEUE_URL',
  notify: 'NOTIFY_QUEUE_URL',
  maintenance: 'MAINTENANCE_QUEUE_URL',
  inbound: 'INBOUND_QUEUE_URL',
};

export class WorkersStack extends RobesStack {
  readonly functions: Record<QueueWorkerName, WorkerFunction>;

  constructor(scope: Construct, id: string, props: WorkersStackProps) {
    super(scope, id, props);
    const { config, secrets, queues } = props;
    const db = { DATABASE_URL_SECRET_ARN: secrets.databaseUrl };

    const grants: Record<QueueWorkerName, WorkerGrants> = {
      generate: {
        secrets: {
          ...db,
          GEMINI_API_KEY_SECRET_ARN: secrets.geminiApiKey,
          FAL_API_KEY_SECRET_ARN: secrets.falApiKey,
        },
        sendTo: ['notify'],
        s3: [
          // catalog/: the shared model portraits, read as the render reference and drawn once.
          { actions: ['s3:GetObject'], prefixes: ['media/', 'catalog/'] },
          // uploads/: generated frames go through the same S3 event → RenditionFn path as photos.
          { actions: ['s3:PutObject'], prefixes: ['generated/', 'media/', 'uploads/', 'catalog/'] },
        ],
      },
      batch: {
        secrets: { ...db, GEMINI_API_KEY_SECRET_ARN: secrets.geminiApiKey },
        // jobs-interactive: overnight fallbacks and the anchor look_render (M5 task 3).
        sendTo: ['notify', 'jobs-interactive'],
        s3: [
          { actions: ['s3:GetObject'], prefixes: ['media/'] },
          { actions: ['s3:PutObject'], prefixes: ['generated/'] },
        ],
      },
      // SEC-40: the SSRF surface holds no credentials; results go back through the job queue.
      fetch: { secrets: {}, sendTo: ['jobs-interactive'] },
      notify: {
        secrets: {
          ...db,
          EXPO_ACCESS_TOKEN_SECRET_ARN: secrets.expoAccessToken,
          UNSUB_HMAC_KEY_SECRET_ARN: secrets.unsubHmacKey,
        },
        sendTo: [],
        sendEmail: true,
      },
      maintenance: {
        secrets: db,
        sendTo: ['jobs-interactive', 'jobs-batch', 'notify'],
        s3: [
          {
            actions: ['s3:DeleteObject', 's3:DeleteObjectVersion'],
            prefixes: ['uploads/', 'media/', 'generated/', 'shared/', 'exports/'],
          },
          // Data exports (SEC-81): reads nothing from S3; writes one JSON file per request.
          { actions: ['s3:PutObject'], prefixes: ['exports/'] },
        ],
        listBucket: true,
      },
      // Forwarded receipts: reads the raw mail SES stored, reads it with Gemini, files it to
      // the Inbox and sends the "receipt read" email. No links in the mail are followed.
      inbound: {
        secrets: {
          ...db,
          GEMINI_API_KEY_SECRET_ARN: secrets.geminiApiKey,
          UNSUB_HMAC_KEY_SECRET_ARN: secrets.unsubHmacKey,
        },
        sendTo: [],
        s3: [{ actions: ['s3:GetObject'], prefixes: [INBOUND_PREFIX] }],
        sendEmail: true,
      },
    };

    this.functions = recordOf(keysOf(QUEUE_WORKERS), (name) => {
      const spec = QUEUE_WORKERS[name];
      const grant = grants[name];
      const worker = new WorkerFunction(this, `${name}Fn`, {
        config,
        entryDir: props.workersEntryDir,
        name,
        spec,
        secrets: grant.secrets,
        reservedConcurrentExecutions:
          name === 'generate' ? config.workers.generateReservedConcurrency : undefined,
        environment: {
          ...(grant.s3 || grant.listBucket ? { MEDIA_BUCKET: config.media.bucketName } : {}),
          ...Object.fromEntries(grant.sendTo.map((q) => [QUEUE_ENV[q], queues[q].queue.queueUrl])),
          ...(grant.sendEmail
            ? {
                MAIL_FROM: config.email.fromAddress,
                SES_CONFIGURATION_SET: configurationSetName(config),
                // Links in mail point at the app's primary origin.
                APP_URL: config.appOrigins[0] ?? '',
              }
            : {}),
          ...(name === 'inbound' ? { INBOUND_MAIL_DOMAIN: inboundDomain(config) } : {}),
        },
      });

      worker.fn.addEventSource(
        new SqsEventSource(queues[spec.queue].queue, {
          batchSize: spec.batchSize,
          reportBatchItemFailures: true,
        }),
      );
      if (grant.sendTo.length > 0) {
        worker.role.addToPolicy(
          new iam.PolicyStatement({
            actions: ['sqs:SendMessage'],
            resources: grant.sendTo.map((q) => queues[q].queue.queueArn),
          }),
        );
      }
      for (const s3 of grant.s3 ?? []) {
        worker.role.addToPolicy(
          new iam.PolicyStatement({
            actions: s3.actions,
            resources: objectArns(this, config.media.bucketName, s3.prefixes),
          }),
        );
      }
      if (grant.sendEmail) worker.role.addToPolicy(sesSendStatement(this, config));
      if (grant.listBucket) {
        worker.role.addToPolicy(
          new iam.PolicyStatement({
            actions: ['s3:ListBucket', 's3:ListBucketVersions'],
            resources: [bucketArn(this, config.media.bucketName)],
          }),
        );
      }
      return worker;
    });
  }
}
