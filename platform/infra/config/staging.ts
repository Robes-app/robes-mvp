import { fromEnv, publicKeyFor } from './env';
import type { StageConfig } from './types';

export const staging: StageConfig = {
  stage: 'staging',
  stageId: 'Staging',
  stackPrefix: 'Stg',
  namePrefix: 'robes-staging',
  env: { account: fromEnv('ROBES_STAGING_AWS_ACCOUNT_ID'), region: 'eu-west-1' },
  retain: false,
  terminationProtection: false,
  appOrigins: ['https://staging.byrobes.com', 'http://localhost:3000'],
  github: {
    repository: 'Robes-app/robes-mvp',
    environment: 'staging',
    oidcProviderArn: fromEnv('ROBES_STAGING_GITHUB_OIDC_PROVIDER_ARN'),
  },
  email: {
    domain: 'staging.mail.byrobes.com',
    fromAddress: 'Robes <hello@staging.mail.byrobes.com>',
  },
  api: { accessKeys: [{ serial: 1, status: 'Active' }] },
  media: {
    bucketName: 'robes-staging-media',
    domainName: fromEnv('ROBES_STAGING_MEDIA_DOMAIN'),
    certificateArn: fromEnv('ROBES_STAGING_MEDIA_CERT_ARN'),
    signingPublicKeyPem: publicKeyFor('staging'),
  },
  workers: { generateReservedConcurrency: 5, renditionLayerArns: [] },
  alerts: { email: fromEnv('ROBES_STAGING_ALERT_EMAIL') },
  budget: { monthlyUsd: 150, email: fromEnv('ROBES_STAGING_BUDGET_EMAIL') },
};
