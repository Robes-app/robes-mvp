import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { keysOf, recordOf } from '../lib/record';
import { RobesStack, type RobesStackProps, removalPolicy } from '../lib/robes-stack';

// Names from infrastructure.md §4.1. Values are set out of band (runbooks/key-rotation.md).
export const SECRET_NAMES = {
  // robes_app role connection string via the Supabase pooler (ADR-019).
  databaseUrl: 'database/url',
  geminiApiKey: 'gemini/api-key',
  supabaseServiceRole: 'supabase/service-role',
  supabaseUrl: 'supabase/url',
  resendApiKey: 'resend/api-key',
  resendWebhookSecret: 'resend/webhook-secret',
  cloudfrontSigningKey: 'cloudfront/signing-key',
  falApiKey: 'fal/api-key',
  expoAccessToken: 'expo/access-token',
  unsubHmacKey: 'unsub/hmac-key',
} as const;

export type SecretKey = keyof typeof SECRET_NAMES;
export type Secrets = Record<SecretKey, secretsmanager.ISecret>;

export class SecretsStack extends RobesStack {
  readonly secrets: Secrets;

  constructor(scope: Construct, id: string, props: RobesStackProps) {
    super(scope, id, props);
    // Random placeholder so a missed step fails auth loudly instead of running with an empty key.
    this.secrets = recordOf(keysOf(SECRET_NAMES), (key) => {
      const name = SECRET_NAMES[key];
      return new secretsmanager.Secret(this, key, {
        secretName: `${props.config.namePrefix}/${name}`,
        description: `Robes ${props.config.stage} ${name}; set via runbooks/key-rotation.md`,
        generateSecretString: { passwordLength: 48, excludePunctuation: true },
        removalPolicy: removalPolicy(props.config),
      });
    });
  }
}
