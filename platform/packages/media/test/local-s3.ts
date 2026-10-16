// docker-compose MinIO; tests use their own bucket so dev uploads are never touched.
export const LOCAL_S3 = {
  bucket: process.env.TEST_MEDIA_BUCKET ?? 'robes-test-media',
  region: 'eu-west-1',
  endpoint: process.env.TEST_MEDIA_S3_ENDPOINT ?? 'http://127.0.0.1:59000',
  credentials: { accessKeyId: 'robes', secretAccessKey: 'robes-local-secret' },
};
