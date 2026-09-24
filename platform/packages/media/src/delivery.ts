import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  getSignedUrl as getCloudFrontSignedUrl,
  getSignedCookies,
} from '@aws-sdk/cloudfront-signer';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { mediaKeys } from './keys';
import type { MediaBucket } from './storage';

const DAY_MS = 24 * 60 * 60 * 1000;
export const COOKIE_TTL_MS = 12 * 60 * 60 * 1000;

export interface SessionCookie {
  name: string;
  value: string;
  path: string;
  domain?: string;
  expires: Date;
}

// Private media is only ever reachable through these signatures (SEC-21).
export interface MediaDelivery {
  readonly mode: 'cloudfront' | 'local';
  url(key: string, now?: Date): Promise<string>;
  // Web: path-scoped cookies for `/media/{userId}/*`; empty where cookies don't apply.
  sessionCookies(userId: string, now?: Date): SessionCookie[];
}

// Signs from the start of the UTC day for 48 h, so a URL is identical all day and image caches stay warm.
export function dayStableWindow(now: Date): { signedAt: Date; expiresAt: Date } {
  const signedAt = new Date(Math.floor(now.getTime() / DAY_MS) * DAY_MS);
  return { signedAt, expiresAt: new Date(signedAt.getTime() + 2 * DAY_MS) };
}

export interface CloudFrontConfig {
  // e.g. https://media.byrobes.com
  origin: string;
  keyPairId: string;
  privateKey: string;
  // Parent domain shared by the app and the media host, e.g. byrobes.com.
  cookieDomain?: string | undefined;
}

export function createCloudFrontDelivery(config: CloudFrontConfig): MediaDelivery {
  const origin = config.origin.replace(/\/$/, '');
  return {
    mode: 'cloudfront',
    async url(key, now = new Date()) {
      return getCloudFrontSignedUrl({
        url: `${origin}/${key}`,
        keyPairId: config.keyPairId,
        privateKey: config.privateKey,
        dateLessThan: dayStableWindow(now).expiresAt,
      });
    },
    sessionCookies(userId, now = new Date()) {
      const prefix = mediaKeys.userMediaPrefix(userId);
      const expires = new Date(now.getTime() + COOKIE_TTL_MS);
      const policy = JSON.stringify({
        Statement: [
          {
            Resource: `${origin}/${prefix}*`,
            Condition: { DateLessThan: { 'AWS:EpochTime': Math.floor(expires.getTime() / 1000) } },
          },
        ],
      });
      const signed = getSignedCookies({
        keyPairId: config.keyPairId,
        privateKey: config.privateKey,
        policy,
      });
      return Object.entries(signed).map(([name, value]) => ({
        name,
        value: String(value),
        path: `/${prefix}`,
        ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
        expires,
      }));
    },
  };
}

// Local dev: presigned MinIO GETs stand in for CloudFront; the bucket itself stays private.
export function createLocalDelivery({ client, bucket }: MediaBucket): MediaDelivery {
  return {
    mode: 'local',
    async url(key, now = new Date()) {
      const { signedAt, expiresAt } = dayStableWindow(now);
      return getS3SignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        signingDate: signedAt,
        expiresIn: Math.floor((expiresAt.getTime() - signedAt.getTime()) / 1000),
      });
    },
    sessionCookies: () => [],
  };
}
