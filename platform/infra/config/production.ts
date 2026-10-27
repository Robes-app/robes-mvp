import {
  budgetsEnabled,
  fromEnv,
  mediaBucketName,
  publicKeyFor,
  reservedConcurrency,
  SHARED_RECEIPT_RULE_SET,
} from './env';
import type { StageConfig } from './types';

export const production: StageConfig = {
  stage: 'production',
  stageId: 'Production',
  stackPrefix: 'Prod',
  namePrefix: 'robes-prod',
  env: { account: fromEnv('ROBES_PRODUCTION_AWS_ACCOUNT_ID'), region: 'eu-west-1' },
  retain: true,
  terminationProtection: true,
  appOrigins: ['https://app.byrobes.com', 'https://www.byrobes.com'],
  github: {
    repository: 'Robes-app/robes-mvp',
    environment: 'production',
    oidcProviderArn: fromEnv('ROBES_PRODUCTION_GITHUB_OIDC_PROVIDER_ARN'),
  },
  email: {
    domain: 'mail.byrobes.com',
    fromAddress: 'Robes <hello@mail.byrobes.com>',
    sharedReceiptRuleSet: SHARED_RECEIPT_RULE_SET,
  },
  api: { accessKeys: [{ serial: 1, status: 'Active' }] },
  media: {
    bucketName: mediaBucketName('robes-prod', fromEnv('ROBES_PRODUCTION_AWS_ACCOUNT_ID')),
    domainName: fromEnv('ROBES_PRODUCTION_MEDIA_DOMAIN'),
    certificateArn: fromEnv('ROBES_PRODUCTION_MEDIA_CERT_ARN'),
    signingPublicKeyPem: publicKeyFor('production'),
  },
  workers: { generateReservedConcurrency: reservedConcurrency('production', 20) },
  // One PostHog project for both stages for now; events carry `environment`.
  posthog: { key: fromEnv('ROBES_POSTHOG_KEY') },
  alerts: { email: fromEnv('ROBES_PRODUCTION_ALERT_EMAIL') },
  budget: {
    enabled: budgetsEnabled('production'),
    monthlyUsd: 1000,
    email: fromEnv('ROBES_PRODUCTION_BUDGET_EMAIL'),
  },
};
