import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Annotations, Aws, CfnOutput, Duration } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import { SHARP_VERSION } from '../lib/native-modules';
import { RobesStack, type RobesStackProps, removalPolicy } from '../lib/robes-stack';
import { bucketArn, objectArns } from '../lib/s3-arns';
import { WorkerFunction } from '../lib/worker-function';
import { RENDITION_WORKER } from '../lib/workers';
import type { Secrets } from './secrets-stack';

const PLACEHOLDER_KEY = fileURLToPath(
  new URL('../../config/keys/placeholder.cloudfront.pub.pem', import.meta.url),
);

// infrastructure.md §5: prefixes that trigger RenditionFn.
export const RENDITION_PREFIXES = ['uploads/', 'generated/'];
export const PUBLIC_PREFIXES = ['shared/*', 'catalog/*'];

export interface MediaStackProps extends RobesStackProps {
  secrets: Secrets;
  renditionDlq: sqs.IQueue;
  workersEntryDir: string;
}

export class MediaStack extends RobesStack {
  readonly bucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;
  readonly rendition: WorkerFunction;

  constructor(scope: Construct, id: string, props: MediaStackProps) {
    super(scope, id, props);
    const { config } = props;
    const { bucketName } = config.media;

    this.rendition = new WorkerFunction(this, 'RenditionFn', {
      config,
      entryDir: props.workersEntryDir,
      name: 'rendition',
      spec: RENDITION_WORKER,
      deadLetterQueue: props.renditionDlq,
      secrets: { DATABASE_URL_SECRET_ARN: props.secrets.databaseUrl },
      environment: { MEDIA_BUCKET: bucketName },
      nativeModules: { sharp: SHARP_VERSION },
    });
    this.rendition.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: objectArns(this, bucketName, RENDITION_PREFIXES),
      }),
    );
    this.rendition.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: objectArns(this, bucketName, ['media/']),
      }),
    );
    const invoke = new lambda.CfnPermission(this, 'S3InvokeRendition', {
      action: 'lambda:InvokeFunction',
      functionName: this.rendition.fn.functionArn,
      principal: 's3.amazonaws.com',
      sourceAccount: Aws.ACCOUNT_ID,
      sourceArn: bucketArn(this, bucketName),
    });

    this.bucket = new s3.Bucket(this, 'Media', {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: removalPolicy(config),
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: config.appOrigins,
          allowedHeaders: ['content-type', 'x-amz-*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        { id: 'generated-7d', prefix: 'generated/', expiration: Duration.days(7) },
        { id: 'uploads-30d', prefix: 'uploads/', expiration: Duration.days(30) },
        {
          id: 'media-intelligent-tiering',
          prefix: 'media/',
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(30),
            },
          ],
        },
        {
          id: 'noncurrent-and-multipart',
          noncurrentVersionExpiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(1),
          expiredObjectDeleteMarker: true,
        },
      ],
    });
    // Native notification config: bucket.addEventNotification would add a custom-resource
    // Lambda whose role needs s3:PutBucketNotification on `*`.
    const cfnBucket = this.bucket.node.defaultChild as s3.CfnBucket;
    cfnBucket.notificationConfiguration = {
      lambdaConfigurations: RENDITION_PREFIXES.map((prefix) => ({
        event: 's3:ObjectCreated:*',
        function: this.rendition.fn.functionArn,
        filter: { s3Key: { rules: [{ name: 'prefix', value: prefix }] } },
      })),
    };
    cfnBucket.addResourceDependency(invoke);

    this.distribution = this.createDistribution(config.media.signingPublicKeyPem);

    new CfnOutput(this, 'MediaBucketName', { value: this.bucket.bucketName });
    new CfnOutput(this, 'MediaDistributionDomain', {
      value: this.distribution.distributionDomainName,
    });
  }

  private createDistribution(publicKeyPem: string | undefined): cloudfront.Distribution {
    const { config } = this;
    let encodedKey = publicKeyPem;
    if (!encodedKey) {
      // Fail closed: nobody holds the private half, so signed paths stay unreadable.
      Annotations.of(this).addWarningV2(
        '@robes/infra:placeholder-signing-key',
        `No CloudFront public key for ${config.stage}; using a placeholder. See runbooks/key-rotation.md.`,
      );
      encodedKey = readFileSync(PLACEHOLDER_KEY, 'utf8');
    }
    const publicKey = new cloudfront.PublicKey(this, 'SigningPublicKey', {
      encodedKey,
      comment: `Robes ${config.stage} media signing key`,
    });
    const keyGroup = new cloudfront.KeyGroup(this, 'SigningKeyGroup', { items: [publicKey] });

    // Signature query params are validated before caching, so the key is the path alone.
    const cachePolicy = new cloudfront.CachePolicy(this, 'PathOnlyCache', {
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
      minTtl: Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
    const headers = (id: string, corp: string): cloudfront.ResponseHeadersPolicy =>
      new cloudfront.ResponseHeadersPolicy(this, id, {
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [{ header: 'Cross-Origin-Resource-Policy', value: corp, override: true }],
        },
      });

    const origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);
    const base: cloudfront.BehaviorOptions = {
      origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy,
      compress: true,
    };
    const publicBehavior: cloudfront.BehaviorOptions = {
      ...base,
      responseHeadersPolicy: headers('PublicHeaders', 'cross-origin'),
    };

    const { domainName, certificateArn } = config.media;
    if (domainName && !certificateArn) {
      throw new Error(`media.domainName for ${config.stage} needs a us-east-1 certificateArn`);
    }

    return new cloudfront.Distribution(this, 'Cdn', {
      comment: `Robes ${config.stage} media`,
      defaultBehavior: {
        ...base,
        trustedKeyGroups: [keyGroup],
        responseHeadersPolicy: headers('PrivateHeaders', 'same-site'),
      },
      additionalBehaviors: Object.fromEntries(PUBLIC_PREFIXES.map((p) => [p, publicBehavior])),
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      ...(domainName && certificateArn
        ? {
            domainNames: [domainName],
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            certificate: acm.Certificate.fromCertificateArn(this, 'MediaCert', certificateArn),
          }
        : {}),
    });
  }
}
