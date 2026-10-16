import 'server-only';
import { createCloudFrontDelivery, createLocalDelivery } from '@robes/media/delivery';
import { createMediaBucket, createMediaStorage } from '@robes/media/storage';
import { env } from './env';

const bucket = createMediaBucket(env.media.s3);

export const mediaStorage = createMediaStorage(bucket);
export const mediaDelivery = env.media.cloudfront
  ? createCloudFrontDelivery(env.media.cloudfront)
  : createLocalDelivery(bucket);
