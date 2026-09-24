import { describe, expect, it } from 'vitest';
import { VERCEL_SEND_QUEUES } from '../src/stacks/identity-stack';
import {
  actionsOf,
  functionNamed,
  list,
  POLICY_TYPES,
  roleOf,
  roleStatements,
  type Statement,
  statements,
  synth,
} from './synth';

// Statements allowed a wildcard, with the reason. Expected to stay empty.
const WILDCARD_ALLOWLIST: { sid: string; why: string }[] = [];

const DB_WORKERS = ['generate', 'batch', 'notify', 'maintenance', 'rendition'];

describe.each(['staging', 'production'] as const)('%s IAM', (stageName) => {
  const s = synth(stageName);
  const policies = s
    .resources()
    .filter((r) => POLICY_TYPES.includes(r.type) || r.type === 'AWS::IAM::Role');
  const allows: { where: string; st: Statement }[] = policies.flatMap((p) =>
    statements(p)
      .filter((st) => st.Effect === 'Allow')
      .map((st) => ({ where: `${p.stack}/${p.logicalId}`, st })),
  );

  it('has policies to check', () => {
    expect(allows.length).toBeGreaterThan(20);
  });

  it('no Allow uses a wildcard action, NotAction or NotResource', () => {
    const bad = allows.filter(({ st }) => {
      if (st.NotAction || st.NotResource) return true;
      return list(st.Action).some((a) => a === '*' || /^[a-z0-9-]+:\*$/i.test(a));
    });
    expect(
      bad.filter(({ st }) => !WILDCARD_ALLOWLIST.some((w) => JSON.stringify(st).includes(w.sid))),
    ).toEqual([]);
  });

  it('no Allow targets Resource "*"', () => {
    const bad = allows.filter(({ st }) => list(st.Resource).some((r) => r === '*'));
    expect(bad).toEqual([]);
  });

  it('creates no custom-resource Lambdas', () => {
    const names = s.resources('AWS::Lambda::Function').map((f) => f.properties.FunctionName);
    expect(names.sort()).toEqual(
      ['batch', 'fetch', 'generate', 'maintenance', 'notify', 'rendition'].map(
        (n) => `${s.stage.config.namePrefix}-${n}`,
      ),
    );
  });

  it('gives every function its own role', () => {
    const roles = s.resources('AWS::Lambda::Function').map((f) => roleOf(s, f));
    expect(new Set(roles).size).toBe(roles.length);
  });

  it('fetchFn (SEC-40) has no S3 or Secrets Manager access and no secrets in env', () => {
    const fn = functionNamed(s, 'fetch');
    const actions = actionsOf(roleStatements(s, roleOf(s, fn)));
    expect(actions.filter((a) => /^(s3|secretsmanager|kms):/.test(a))).toEqual([]);
    expect(actions.filter((a) => !/^(sqs|logs):/.test(a))).toEqual([]);
    const env = (fn.properties.Environment as { Variables: Record<string, unknown> }).Variables;
    expect(Object.keys(env).filter((k) => /SECRET|BUCKET/.test(k))).toEqual([]);
  });

  it.each(DB_WORKERS)('%sFn can read the database/url secret', (name) => {
    const fn = functionNamed(s, name);
    const env = (fn.properties.Environment as { Variables: Record<string, unknown> }).Variables;
    const secret = s.resolve(fn.stack, env.DATABASE_URL_SECRET_ARN);
    expect(secret?.properties.Name).toBe(`${s.stage.config.namePrefix}/database/url`);
    const reads = roleStatements(s, roleOf(s, fn)).filter((st) =>
      list(st.Action).includes('secretsmanager:GetSecretValue'),
    );
    expect(reads.flatMap((st) => list(st.Resource)).map((r) => s.resolve(fn.stack, r))).toContain(
      secret,
    );
  });

  it('workers get exactly the secrets they need', () => {
    const expected: Record<string, string[]> = {
      generate: ['database/url', 'fal/api-key', 'gemini/api-key'],
      batch: ['database/url', 'gemini/api-key'],
      notify: ['database/url', 'expo/access-token', 'resend/api-key', 'unsub/hmac-key'],
      maintenance: ['database/url'],
      rendition: ['database/url'],
      fetch: [],
    };
    for (const [name, secrets] of Object.entries(expected)) {
      const fn = functionNamed(s, name);
      const granted = roleStatements(s, roleOf(s, fn))
        .filter((st) => list(st.Action).includes('secretsmanager:GetSecretValue'))
        .flatMap((st) => list(st.Resource))
        .map((r) =>
          String(s.resolve(fn.stack, r)?.properties.Name).replace(
            `${s.stage.config.namePrefix}/`,
            '',
          ),
        );
      expect(granted.sort(), name).toEqual(secrets);
    }
  });

  it('VercelApiRole has only the listed actions, on the listed resources', () => {
    const role = s
      .resources('AWS::IAM::Role')
      .find((r) => r.properties.RoleName === `${s.stage.config.namePrefix}-vercel-api`);
    expect(role).toBeDefined();
    if (!role) return;
    const sts = roleStatements(s, role);
    expect(actionsOf(sts).sort()).toEqual([
      's3:GetObject',
      's3:PutObject',
      'secretsmanager:GetSecretValue',
      'sqs:SendMessage',
    ]);

    const resources = (action: string): unknown[] =>
      sts.filter((st) => list(st.Action).includes(action)).flatMap((st) => list(st.Resource));
    for (const action of ['s3:PutObject', 's3:GetObject']) {
      expect(resources(action)).toEqual([
        `arn:aws:s3:::${s.stage.config.media.bucketName}/uploads/*`,
      ]);
    }
    const queues = resources('sqs:SendMessage').map(
      (r) => s.resolve(role.stack, r)?.properties.QueueName,
    );
    expect(queues.sort()).toEqual(
      VERCEL_SEND_QUEUES.map((q) => `${s.stage.config.namePrefix}-${q}`).sort(),
    );
    const secrets = resources('secretsmanager:GetSecretValue').map(
      (r) => s.resolve(role.stack, r)?.properties.Name,
    );
    expect(secrets).toEqual([`${s.stage.config.namePrefix}/cloudfront/signing-key`]);
  });

  it('OIDC trust is bound to the repo/project and environment', () => {
    const trust = (name: string): string => {
      const role = s
        .resources('AWS::IAM::Role')
        .find((r) => r.properties.RoleName === `${s.stage.config.namePrefix}-${name}`);
      return JSON.stringify(role?.properties.AssumeRolePolicyDocument);
    };
    const { github, vercel } = s.stage.config;
    expect(trust('github-deploy')).toContain(
      `repo:${github.repository}:environment:${github.environment}`,
    );
    expect(trust('vercel-api')).toContain(
      `owner:${vercel.teamSlug}:project:${vercel.project}:environment:${vercel.environment}`,
    );
    expect(trust('github-deploy')).toContain('StringEquals');
    expect(trust('github-deploy')).not.toContain('StringLike');
  });

  it('GithubDeployRole can only assume the CDK bootstrap roles', () => {
    const role = s
      .resources('AWS::IAM::Role')
      .find((r) => r.properties.RoleName === `${s.stage.config.namePrefix}-github-deploy`);
    if (!role) throw new Error('missing deploy role');
    const sts = roleStatements(s, role);
    expect(actionsOf(sts)).toEqual(['sts:AssumeRole']);
    expect(JSON.stringify(sts[0]?.Resource)).toContain(':role/cdk-hnb659fds-*-');
  });
});
