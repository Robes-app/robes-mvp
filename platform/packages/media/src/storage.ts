import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const UPLOAD_URL_TTL_SECONDS = 5 * 60;

export interface S3Config {
  bucket: string;
  region: string;
  // MinIO locally; omitted in AWS.
  endpoint?: string | undefined;
  // Local MinIO only; AWS uses the ambient role (SEC-73).
  credentials?: { accessKeyId: string; secretAccessKey: string } | undefined;
}

export interface MediaBucket {
  client: S3Client;
  bucket: string;
}

export function createMediaBucket(config: S3Config): MediaBucket {
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    ...(config.credentials ? { credentials: config.credentials } : {}),
    // Default CRC32 checksums would add headers a browser PUT can't produce.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return { client, bucket: config.bucket };
}

export interface UploadRequest {
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObject {
  bytes: number;
  contentType: string | undefined;
}

export interface MediaStorage {
  presignPut(key: string, opts: { contentType: string; bytes: number }): Promise<UploadRequest>;
  head(key: string): Promise<StoredObject | null>;
  getObject(key: string): Promise<Uint8Array | null>;
  putObject(
    key: string,
    body: Uint8Array,
    opts: { contentType: string; cacheControl?: string },
  ): Promise<void>;
  deleteObject(key: string): Promise<void>;
  // A short-lived GET that downloads as `filename` (data exports; SEC-81).
  presignDownload(key: string, opts: { filename: string; expiresIn: number }): Promise<string>;
  // Deletes every object under the prefix (account deletion); returns how many went.
  deletePrefix(prefix: string): Promise<number>;
}

function isMissing(err: unknown): boolean {
  return err instanceof NoSuchKey || err instanceof NotFound;
}

export function createMediaStorage({ client, bucket }: MediaBucket): MediaStorage {
  return {
    async presignPut(key, { contentType, bytes }) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: bytes,
      });
      // Signing both headers means S3 rejects any other type or size (SEC-20).
      const url = await getSignedUrl(client, command, {
        expiresIn: UPLOAD_URL_TTL_SECONDS,
        signableHeaders: new Set(['content-type', 'content-length']),
      });
      return {
        method: 'PUT',
        url,
        headers: { 'content-type': contentType },
        expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
      };
    },

    async head(key) {
      try {
        const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { bytes: res.ContentLength ?? 0, contentType: res.ContentType };
      } catch (err) {
        if (isMissing(err)) return null;
        throw err;
      }
    },

    async getObject(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return res.Body ? await res.Body.transformToByteArray() : null;
      } catch (err) {
        if (isMissing(err)) return null;
        throw err;
      }
    },

    async putObject(key, body, { contentType, cacheControl }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ...(cacheControl ? { CacheControl: cacheControl } : {}),
        }),
      );
    },

    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async presignDownload(key, { filename, expiresIn }) {
      if (!/^[\w.-]+$/.test(filename)) throw new Error('invalid filename');
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${filename}"`,
        }),
        { expiresIn },
      );
    },

    async deletePrefix(prefix) {
      // A prefix must end in "/" so `media/<id>` can never match `media/<id>-other`.
      if (!prefix.endsWith('/') || prefix === '/') throw new Error('invalid prefix');
      let deleted = 0;
      let token: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
        );
        const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
        if (keys.length > 0) {
          const res = await client.send(
            new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }),
          );
          if (res.Errors?.length) throw new Error(`delete failed for ${res.Errors.length} objects`);
          deleted += keys.length;
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return deleted;
    },
  };
}
