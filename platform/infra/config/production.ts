import { fromEnv, publicKeyFor } from './env';
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
  vercel: {
    teamSlug: fromEnv('ROBES_VERCEL_TEAM_SLUG') ?? 'robes',
    project: 'robes-app',
    environment: 'production',
    oidcProviderArn: fromEnv('ROBES_PRODUCTION_VERCEL_OIDC_PROVIDER_ARN'),
  },
  media: {
    bucketName: 'robes-prod-media',
    domainName: fromEnv('ROBES_PRODUCTION_MEDIA_DOMAIN'),
    certificateArn: fromEnv('ROBES_PRODUCTION_MEDIA_CERT_ARN'),
    signingPublicKeyPem: publicKeyFor('production'),
  },
  workers: { generateReservedConcurrency: 20, renditionLayerArns: [] },
  alerts: { email: fromEnv('ROBES_PRODUCTION_ALERT_EMAIL') },
  budget: { monthlyUsd: 1000, email: fromEnv('ROBES_PRODUCTION_BUDGET_EMAIL') },
};
