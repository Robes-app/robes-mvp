import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { StageConfig } from '../../config';

export interface RobesStackProps extends StackProps {
  config: StageConfig;
}

export class RobesStack extends Stack {
  readonly config: StageConfig;

  constructor(scope: Construct, id: string, props: RobesStackProps) {
    super(scope, id, {
      ...props,
      stackName: `${props.config.stackPrefix}-${id}`,
      terminationProtection: props.config.terminationProtection,
    });
    this.config = props.config;
  }
}

export function removalPolicy(config: StageConfig): RemovalPolicy {
  return config.retain ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
}
