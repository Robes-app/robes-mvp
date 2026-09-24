import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { keysOf, recordOf } from '../lib/record';
import { RobesStack, type RobesStackProps, removalPolicy } from '../lib/robes-stack';

interface SecretSpec {
  name: string;
  /** JSON secrets: fixed fields to fill in, plus one generated placeholder field. */
  json?: { fields: string[]; generated: string };
}

// infrastructure.md §4.1 as amended by ADR-019/020. Values are set out of band (runbooks/key-rotation.md).
export const SECRET_SPECS = {
  databaseUrl: { name: 'database/url' },
  betterAuthSecret: { name: 'auth/better-auth-secret' },
  appleAuth: {
    name: 'auth/apple',
    json: { fields: ['clientId', 'teamId', 'keyId'], generated: 'privateKey' },
  },
  googleAuth: { name: 'auth/google', json: { fields: ['clientId'], generated: 'clientSecret' } },
  geminiApiKey: { name: 'gemini/api-key' },
  resendApiKey: { name: 'resend/api-key' },
  resendWebhookSecret: { name: 'resend/webhook-secret' },
  cloudfrontSigningKey: { name: 'cloudfront/signing-key' },
  falApiKey: { name: 'fal/api-key' },
  expoAccessToken: { name: 'expo/access-token' },
  unsubHmacKey: { name: 'unsub/hmac-key' },
} satisfies Record<string, SecretSpec>;

export type SecretKey = keyof typeof SECRET_SPECS;
export type Secrets = Record<SecretKey, secretsmanager.ISecret>;

export class SecretsStack extends RobesStack {
  readonly secrets: Secrets;

  constructor(scope: Construct, id: string, props: RobesStackProps) {
    super(scope, id, props);
    // Random placeholder so a missed step fails auth loudly instead of running with an empty key.
    this.secrets = recordOf(keysOf(SECRET_SPECS), (key) => {
      const spec: SecretSpec = SECRET_SPECS[key];
      return new secretsmanager.Secret(this, key, {
        secretName: `${props.config.namePrefix}/${spec.name}`,
        description: `Robes ${props.config.stage} ${spec.name}; set via runbooks/key-rotation.md`,
        generateSecretString: {
          passwordLength: 48,
          excludePunctuation: true,
          ...(spec.json
            ? {
                secretStringTemplate: JSON.stringify(
                  Object.fromEntries(spec.json.fields.map((f) => [f, ''])),
                ),
                generateStringKey: spec.json.generated,
              }
            : {}),
        },
        removalPolicy: removalPolicy(props.config),
      });
    });
  }
}
