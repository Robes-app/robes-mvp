import { Stack } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

// Built from the fixed bucket name, not bucket.bucketArn, so notification → permission → role
// → bucket never forms a CloudFormation dependency cycle.
export function bucketArn(scope: Construct, bucketName: string): string {
  return Stack.of(scope).formatArn({
    service: 's3',
    region: '',
    account: '',
    resource: bucketName,
  });
}

export function objectArns(scope: Construct, bucketName: string, prefixes: string[]): string[] {
  const base = bucketArn(scope, bucketName);
  return prefixes.map((prefix) => `${base}/${prefix}*`);
}
