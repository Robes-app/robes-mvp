import { Match } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { list, must, synth } from './synth';

describe.each(['staging', 'production'] as const)('%s media', (stageName) => {
  const s = synth(stageName);
  const buckets = s.resources('AWS::S3::Bucket');

  it('has buckets', () => {
    expect(buckets.length).toBeGreaterThan(0);
  });

  it.each(buckets.map((b) => [b.logicalId, b] as const))(
    '%s blocks public access, encrypts and versions',
    (_id, bucket) => {
      expect(bucket.properties.PublicAccessBlockConfiguration).toEqual({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      });
      expect(bucket.properties.BucketEncryption).toEqual({
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
        ],
      });
      expect(bucket.properties.VersioningConfiguration).toEqual({ Status: 'Enabled' });
    },
  );

  it('applies the §5 lifecycle rules', () => {
    s.template(`${s.stage.config.stackPrefix}-Media`).hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({ Prefix: 'generated/', ExpirationInDays: 7, Status: 'Enabled' }),
          Match.objectLike({ Prefix: 'uploads/', ExpirationInDays: 30, Status: 'Enabled' }),
          Match.objectLike({
            Prefix: 'media/',
            Transitions: [{ StorageClass: 'INTELLIGENT_TIERING', TransitionInDays: 30 }],
          }),
          Match.objectLike({
            NoncurrentVersionExpiration: { NoncurrentDays: 30 },
            AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
          }),
        ]),
      },
    });
  });

  it('allows presigned PUT only from the configured app origins', () => {
    const bucket = must(buckets[0], 'bucket');
    const rules = (bucket.properties.CorsConfiguration as { CorsRules: Record<string, unknown>[] })
      .CorsRules;
    expect(rules).toHaveLength(1);
    expect(rules[0]?.AllowedMethods).toEqual(['PUT']);
    expect(rules[0]?.AllowedOrigins).toEqual(s.stage.config.appOrigins);
    expect(rules[0]?.AllowedOrigins).not.toContain('*');
  });

  it('triggers RenditionFn on uploads/ and generated/ without a custom resource', () => {
    const [bucket] = buckets;
    const config = bucket?.properties.NotificationConfiguration as {
      LambdaConfigurations: { Filter: { S3Key: { Rules: { Value: string }[] } } }[];
    };
    const prefixes = config.LambdaConfigurations.map((c) => c.Filter.S3Key.Rules[0]?.Value);
    expect(prefixes.sort()).toEqual(['generated/', 'uploads/']);
    expect(s.resources('Custom::S3BucketNotifications')).toHaveLength(0);
  });

  it('only lets CloudFront read the bucket, and denies non-TLS', () => {
    const policy = must(s.resources('AWS::S3::BucketPolicy')[0], 'bucket policy');
    const sts = (policy.properties.PolicyDocument as { Statement: Record<string, unknown>[] })
      .Statement;
    const allows = sts.filter((st) => st.Effect === 'Allow');
    expect(allows).toHaveLength(1);
    expect(allows[0]?.Principal).toEqual({ Service: 'cloudfront.amazonaws.com' });
    expect(list(allows[0]?.Action as string[])).toEqual(['s3:GetObject']);
    expect(
      sts.some((st) => st.Effect === 'Deny' && JSON.stringify(st).includes('SecureTransport')),
    ).toBe(true);
  });

  it('serves private media only with signatures, over OAC and HTTP/3', () => {
    const [dist] = s.resources('AWS::CloudFront::Distribution');
    const cfg = dist?.properties.DistributionConfig as Record<string, unknown>;
    const def = cfg.DefaultCacheBehavior as Record<string, unknown>;
    expect(def.TrustedKeyGroups).toHaveLength(1);
    expect(def.ViewerProtocolPolicy).toBe('https-only');
    expect(cfg.HttpVersion).toBe('http2and3');
    const origins = cfg.Origins as Record<string, unknown>[];
    expect(origins.every((o) => o.OriginAccessControlId !== undefined)).toBe(true);
    const extra =
      (cfg.CacheBehaviors as { PathPattern: string; TrustedKeyGroups?: unknown }[]) ?? [];
    expect(extra.map((b) => b.PathPattern).sort()).toEqual(['catalog/*', 'shared/*']);
    expect(s.resources('AWS::CloudFront::OriginAccessControl')).toHaveLength(1);
  });

  it('sets nosniff and CORP on every response', () => {
    const policies = s.resources('AWS::CloudFront::ResponseHeadersPolicy');
    expect(policies).toHaveLength(2);
    for (const p of policies) {
      const cfg = p.properties.ResponseHeadersPolicyConfig as Record<
        string,
        Record<string, unknown>
      >;
      expect(cfg.SecurityHeadersConfig?.ContentTypeOptions).toEqual({ Override: true });
      expect(JSON.stringify(cfg.CustomHeadersConfig)).toContain('Cross-Origin-Resource-Policy');
    }
  });

  it('keys the cache on the path only', () => {
    const policy = must(s.resources('AWS::CloudFront::CachePolicy')[0], 'cache policy');
    const params = (policy.properties.CachePolicyConfig as Record<string, Record<string, unknown>>)
      .ParametersInCacheKeyAndForwardedToOrigin;
    expect(params?.QueryStringsConfig).toEqual({ QueryStringBehavior: 'none' });
    expect(params?.HeadersConfig).toEqual({ HeaderBehavior: 'none' });
    expect(params?.CookiesConfig).toEqual({ CookieBehavior: 'none' });
  });
});
