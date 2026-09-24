import { readFileSync } from 'node:fs';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import type { StageName } from '../config';
import { buildApp } from '../src/app';
import type { RobesStage } from '../src/stage';

type Json = Record<string, unknown>;

export interface Resource {
  stack: string;
  logicalId: string;
  type: string;
  properties: Json;
  deletionPolicy?: string;
  updateReplacePolicy?: string;
}

export interface Synth {
  stage: RobesStage;
  templates: Record<string, Json>;
  resources(type?: string): Resource[];
  /** Follows Ref / GetAtt / cross-stack GetStackOutput / ImportValue to the target resource. */
  resolve(stack: string, value: unknown): Resource | undefined;
  template(stackName: string): Template;
}

const cache = new Map<StageName, Synth>();

const CDK_JSON = JSON.parse(readFileSync(new URL('../cdk.json', import.meta.url), 'utf8')) as {
  context: Json;
};

// Same feature flags as `cdk synth`; esbuild skipped here, the `synth` script bundles for real.
export function testApp(context: Json = {}): App {
  return new App({
    context: { ...CDK_JSON.context, fixtures: 'true', 'aws:cdk:bundling-stacks': [], ...context },
  });
}

export function synth(stageName: StageName): Synth {
  const hit = cache.get(stageName);
  if (hit) return hit;

  const [stage] = buildApp(testApp({ stage: stageName }));
  if (!stage) throw new Error('no stage built');

  const cdkTemplates = new Map<string, Template>();
  const templates: Record<string, Json> = {};
  for (const stack of stage.stacks) {
    const template = Template.fromStack(stack);
    cdkTemplates.set(stack.stackName, template);
    templates[stack.stackName] = template.toJSON();
  }

  const all: Resource[] = Object.entries(templates).flatMap(([stack, t]) =>
    Object.entries((t.Resources ?? {}) as Record<string, Json>).map(([logicalId, r]) => ({
      stack,
      logicalId,
      type: r.Type as string,
      properties: (r.Properties ?? {}) as Json,
      deletionPolicy: r.DeletionPolicy as string | undefined,
      updateReplacePolicy: r.UpdateReplacePolicy as string | undefined,
    })),
  );

  const byId = (stack: string, id: string): Resource | undefined =>
    all.find((r) => r.stack === stack && r.logicalId === id);

  const resolve = (stack: string, value: unknown): Resource | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const v = value as Json;
    if (typeof v.Ref === 'string') return byId(stack, v.Ref);
    if (Array.isArray(v['Fn::GetAtt'])) return byId(stack, v['Fn::GetAtt'][0] as string);
    const out = v['Fn::GetStackOutput'] as { StackName: string; OutputName: string } | undefined;
    if (out) {
      const outputs = (templates[out.StackName]?.Outputs ?? {}) as Record<string, Json>;
      return resolve(out.StackName, outputs[out.OutputName]?.Value);
    }
    const imported = v['Fn::ImportValue'];
    if (typeof imported === 'string') {
      for (const [name, t] of Object.entries(templates)) {
        for (const o of Object.values((t.Outputs ?? {}) as Record<string, Json>)) {
          if ((o.Export as Json | undefined)?.Name === imported) return resolve(name, o.Value);
        }
      }
    }
    return undefined;
  };

  const result: Synth = {
    stage,
    templates,
    resources: (type) => (type ? all.filter((r) => r.type === type) : all),
    resolve,
    template: (name) => {
      const t = cdkTemplates.get(name);
      if (!t) throw new Error(`no stack ${name}`);
      return t;
    },
  };
  cache.set(stageName, result);
  return result;
}

export interface Statement {
  Effect: 'Allow' | 'Deny';
  Action?: string | string[];
  NotAction?: string | string[];
  Resource?: unknown;
  NotResource?: unknown;
  Principal?: unknown;
}

export function list<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export const POLICY_TYPES = [
  'AWS::IAM::Policy',
  'AWS::IAM::ManagedPolicy',
  'AWS::S3::BucketPolicy',
  'AWS::SQS::QueuePolicy',
  'AWS::SNS::TopicPolicy',
];

export function statements(r: Resource): Statement[] {
  const doc = r.properties.PolicyDocument as { Statement: Statement[] } | undefined;
  const inline = (r.properties.Policies ?? []) as { PolicyDocument: { Statement: Statement[] } }[];
  return [...(doc?.Statement ?? []), ...inline.flatMap((p) => p.PolicyDocument.Statement)];
}

/** Allow statements attached to the given role resource. */
export function roleStatements(s: Synth, role: Resource): Statement[] {
  const attached = s
    .resources('AWS::IAM::Policy')
    .filter((p) =>
      list(p.properties.Roles as unknown[]).some((ref) => s.resolve(p.stack, ref) === role),
    );
  return [role, ...attached].flatMap(statements).filter((st) => st.Effect === 'Allow');
}

export function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

export function functionNamed(s: Synth, name: string): Resource {
  const fn = s
    .resources('AWS::Lambda::Function')
    .find((r) => r.properties.FunctionName === `${s.stage.config.namePrefix}-${name}`);
  if (!fn) throw new Error(`no function ${name}`);
  return fn;
}

export function roleOf(s: Synth, fn: Resource): Resource {
  const role = s.resolve(fn.stack, fn.properties.Role);
  if (!role) throw new Error(`no role for ${fn.logicalId}`);
  return role;
}

export function actionsOf(sts: Statement[]): string[] {
  return sts.flatMap((st) => list(st.Action));
}
