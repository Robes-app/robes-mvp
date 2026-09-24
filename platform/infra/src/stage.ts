import { Stage, Tags } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { StageConfig } from '../config';
import type { RobesStack } from './lib/robes-stack';
import { BudgetsStack } from './stacks/budgets-stack';
import { EmailStack } from './stacks/email-stack';
import { IdentityStack } from './stacks/identity-stack';
import { MediaStack } from './stacks/media-stack';
import { ObservabilityStack } from './stacks/observability-stack';
import { QueuesStack } from './stacks/queues-stack';
import { SchedulesStack } from './stacks/schedules-stack';
import { SecretsStack } from './stacks/secrets-stack';
import { WorkersStack } from './stacks/workers-stack';

export interface RobesStageOptions {
  workersEntryDir: string;
}

export class RobesStage extends Stage {
  readonly config: StageConfig;
  readonly secrets: SecretsStack;
  readonly queues: QueuesStack;
  readonly email: EmailStack;
  readonly media: MediaStack;
  readonly workers: WorkersStack;
  readonly schedules: SchedulesStack;
  readonly identity: IdentityStack;
  readonly observability: ObservabilityStack;
  readonly budgets: BudgetsStack | undefined;

  constructor(scope: Construct, config: StageConfig, options: RobesStageOptions) {
    super(scope, config.stageId, { env: config.env });
    this.config = config;
    Tags.of(this).add('project', 'robes');
    Tags.of(this).add('environment', config.stage);

    const base = { config };
    this.secrets = new SecretsStack(this, 'Secrets', base);
    this.queues = new QueuesStack(this, 'Queues', base);
    this.email = new EmailStack(this, 'Email', base);
    this.media = new MediaStack(this, 'Media', {
      ...base,
      secrets: this.secrets.secrets,
      renditionDlq: this.queues.renditionDlq,
      workersEntryDir: options.workersEntryDir,
    });
    this.workers = new WorkersStack(this, 'Workers', {
      ...base,
      secrets: this.secrets.secrets,
      queues: this.queues.queues,
      workersEntryDir: options.workersEntryDir,
    });
    // SES permissions use literal ARNs; the identity should still exist before anything sends.
    this.workers.addDependency(this.email);
    this.schedules = new SchedulesStack(this, 'Schedules', { ...base, queues: this.queues.queues });
    this.identity = new IdentityStack(this, 'Identity', {
      ...base,
      queues: this.queues.queues,
      signingKey: this.secrets.secrets.cloudfrontSigningKey,
    });
    this.identity.addDependency(this.email);
    this.observability = new ObservabilityStack(this, 'Observability', {
      ...base,
      queues: this.queues.queues,
      extraDlqs: { rendition: this.queues.renditionDlq },
      functions: [...Object.values(this.workers.functions), this.media.rendition],
      apiUserArn: this.identity.apiUser.userArn,
    });
    this.budgets = config.budget.enabled
      ? new BudgetsStack(this, 'Budgets', { ...base, topic: this.observability.topic })
      : undefined;
  }

  get stacks(): RobesStack[] {
    return [
      this.secrets,
      this.queues,
      this.email,
      this.media,
      this.workers,
      this.schedules,
      this.identity,
      this.observability,
      ...(this.budgets ? [this.budgets] : []),
    ];
  }
}
