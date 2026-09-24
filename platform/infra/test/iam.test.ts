import { describe, expect, it } from 'vitest';
import { API_SEND_QUEUES } from '../src/stacks/identity-stack';
import {
  actionsOf,
  functionNamed,
  list,
  must,
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
  const prefix = s.stage.config.namePrefix;
  const expectSesScoped = (sts: Statement[]): void => {
    const ses = sts.filter((st) => list(st.Action).some((a) => a.startsWith('ses:')));
    expect(ses).toHaveLength(1);
    const [st] = ses;
    expect(list(st?.Action).sort()).toEqual(['ses:SendEmail', 'ses:SendRawEmail']);
    const arns = list(st?.Resource).map((r) => JSON.stringify(r));
    expect(arns).toHaveLength(2);
    expect(arns.some((a) => a.includes(`:identity/${s.stage.config.email.domain}`))).toBe(true);
    expect(arns.some((a) => a.includes(`:configuration-set/${prefix}-email`))).toBe(true);
    expect(JSON.stringify(st?.Condition)).toContain(`*@${s.stage.config.email.domain}`);
  };
  const policies = s
    .resources()
    .filter(
      (r) =>
        POLICY_TYPES.includes(r.type) || r.type === 'AWS::IAM::Role' || r.type === 'AWS::IAM::User',
    );
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

  it('generate can write uploads/ so styled frames reach RenditionFn', () => {
    const fn = functionNamed(s, 'generate');
    const puts = roleStatements(s, roleOf(s, fn))
      .filter((st) => list(st.Action).includes('s3:PutObject'))
      .flatMap((st) => list(st.Resource))
      .map((r) => JSON.stringify(r));
    expect(puts.some((r) => r.includes('/uploads/*'))).toBe(true);
  });

  it('workers get exactly the secrets they need', () => {
    const expected: Record<string, string[]> = {
      generate: ['database/url', 'fal/api-key', 'gemini/api-key'],
      batch: ['database/url', 'gemini/api-key'],
      notify: ['database/url', 'expo/access-token', 'unsub/hmac-key'],
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

  it('the API user is the only IAM user and has exactly its listed permissions', () => {
    const users = s.resources('AWS::IAM::User');
    expect(users.map((u) => u.properties.UserName)).toEqual([`${prefix}-api`]);
    const user = must(users[0], 'api user');
    expect(user.properties.Policies).toBeUndefined();
    expect(user.properties.ManagedPolicyArns).toBeUndefined();

    const sts = roleStatements(s, user);
    expect(actionsOf(sts).sort()).toEqual([
      's3:GetObject',
      's3:PutObject',
      'secretsmanager:GetSecretValue',
      'ses:SendEmail',
      'ses:SendRawEmail',
      'sqs:SendMessage',
    ]);
    const resources = (action: string): unknown[] =>
      sts.filter((st) => list(st.Action).includes(action)).flatMap((st) => list(st.Resource));
    const uploads = `arn:aws:s3:::${s.stage.config.media.bucketName}/uploads/*`;
    expect(resources('s3:PutObject')).toEqual([uploads]);
    expect(resources('s3:GetObject')).toEqual([uploads]);
    const queues = resources('sqs:SendMessage').map(
      (r) => s.resolve(user.stack, r)?.properties.QueueName,
    );
    expect(queues.sort()).toEqual(API_SEND_QUEUES.map((q) => `${prefix}-${q}`).sort());
    const secrets = resources('secretsmanager:GetSecretValue').map(
      (r) => s.resolve(user.stack, r)?.properties.Name,
    );
    expect(secrets).toEqual([`${prefix}/cloudfront/signing-key`]);
    expectSesScoped(sts);
  });

  it('notifyFn sends through SES on the stage identity and config set only', () => {
    const fn = functionNamed(s, 'notify');
    const sts = roleStatements(s, roleOf(s, fn));
    expectSesScoped(sts);
    const env = (fn.properties.Environment as { Variables: Record<string, unknown> }).Variables;
    expect(env.MAIL_FROM).toBe(s.stage.config.email.fromAddress);
    expect(env.SES_CONFIGURATION_SET).toBe(`${prefix}-email`);
    for (const other of ['generate', 'batch', 'fetch', 'maintenance', 'rendition']) {
      const actions = actionsOf(roleStatements(s, roleOf(s, functionNamed(s, other))));
      expect(
        actions.filter((a) => a.startsWith('ses:')),
        other,
      ).toEqual([]);
    }
  });

  it('the access key secret half only lands in Secrets Manager', () => {
    const keys = s.resources('AWS::IAM::AccessKey');
    expect(keys).toHaveLength(s.stage.config.api.accessKeys.length);
    for (const [name, t] of Object.entries(s.templates)) {
      expect(JSON.stringify(t.Outputs ?? {}), name).not.toContain('SecretAccessKey');
    }
    const refs = s
      .resources()
      .filter((r) => JSON.stringify(r.properties).includes('SecretAccessKey'));
    expect(refs.map((r) => r.type)).toEqual(['AWS::SecretsManager::Secret']);
    expect(refs[0]?.properties.Name).toBe(`${prefix}/api/aws-access-key`);
  });

  it('GitHub OIDC trust is bound to the repo and environment; no Vercel federation remains', () => {
    const role = s
      .resources('AWS::IAM::Role')
      .find((r) => r.properties.RoleName === `${prefix}-github-deploy`);
    const trust = JSON.stringify(role?.properties.AssumeRolePolicyDocument);
    const { github } = s.stage.config;
    expect(trust).toContain(`repo:${github.repository}:environment:${github.environment}`);
    expect(trust).toContain('StringEquals');
    expect(trust).not.toContain('StringLike');
    const providers = s.resources('AWS::IAM::OIDCProvider').map((p) => p.properties.Url);
    expect(providers).toEqual(['https://token.actions.githubusercontent.com']);
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
