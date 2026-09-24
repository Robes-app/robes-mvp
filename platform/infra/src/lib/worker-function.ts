import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import type { StageConfig } from '../../config';
import { linuxArm64Install } from './native-modules';
import { removalPolicy } from './robes-stack';
import type { WorkerName, WorkerSpec } from './workers';

export const WORKER_RUNTIME = lambda.Runtime.NODEJS_24_X;
export const WORKER_LOG_RETENTION = logs.RetentionDays.TWO_WEEKS;

export interface WorkerFunctionProps {
  config: StageConfig;
  entryDir: string;
  name: WorkerName;
  spec: WorkerSpec;
  environment?: Record<string, string>;
  /** Env var name → secret; the ARN is passed in the env var and read access granted. */
  secrets?: Record<string, ISecret>;
  reservedConcurrentExecutions?: number;
  deadLetterQueue?: IQueue;
  /** Native deps (name → exact version) kept out of esbuild and installed for linux-arm64 into the asset. */
  nativeModules?: Record<string, string>;
}

export class WorkerFunction extends Construct {
  readonly name: WorkerName;
  readonly fn: NodejsFunction;
  readonly role: iam.Role;
  readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: WorkerFunctionProps) {
    super(scope, id);
    const { config, name, spec } = props;
    const functionName = `${config.namePrefix}-${name}`;
    const entry = join(props.entryDir, `${name}.ts`);
    if (!existsSync(entry)) {
      throw new Error(
        `Worker entry not found: ${entry} (set context workersEntryDir or fixtures=true)`,
      );
    }

    this.name = name;
    this.logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: WORKER_LOG_RETENTION,
      removalPolicy: removalPolicy(config),
    });

    // Own role per function (SEC-73); no AWSLambdaBasicExecutionRole because it grants logs on `*`.
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Execution role for ${functionName}`,
    });
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [this.logGroup.logGroupArn],
      }),
    );

    const nativeModules = props.nativeModules ?? {};
    const secretEnv: Record<string, string> = {};
    for (const [envVar, secret] of Object.entries(props.secrets ?? {})) {
      secretEnv[envVar] = secret.secretArn;
      secret.grantRead(this.role);
    }

    this.fn = new NodejsFunction(this, 'Fn', {
      functionName,
      entry,
      handler: 'handler',
      runtime: WORKER_RUNTIME,
      architecture: lambda.Architecture.ARM_64,
      timeout: spec.timeout,
      memorySize: spec.memorySize,
      role: this.role,
      logGroup: this.logGroup,
      loggingFormat: lambda.LoggingFormat.JSON,
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      deadLetterQueue: props.deadLetterQueue,
      environment: {
        APP_ENV: config.stage,
        NODE_OPTIONS: '--enable-source-maps',
        ...secretEnv,
        ...props.environment,
      },
      bundling: {
        format: OutputFormat.ESM,
        target: 'node24',
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*', ...Object.keys(nativeModules)],
        banner:
          "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
        ...(Object.keys(nativeModules).length > 0
          ? {
              commandHooks: {
                beforeBundling: () => [],
                beforeInstall: () => [],
                afterBundling: (_input: string, outputDir: string) => [
                  linuxArm64Install(outputDir, nativeModules),
                ],
              },
            }
          : {}),
      },
    });
  }
}
