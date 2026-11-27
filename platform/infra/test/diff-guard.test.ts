import { describe, expect, it } from 'vitest';
import { hasChanges, notLambdaCode } from '../src/lib/diff-guard';

const codeOnly = `Stack Production/Workers (Prod-Workers)
Resources
[~] AWS::Lambda::Function GenerateFn GenerateFn8D2A1B3C
 ├─ [~] Code
 │   └─ [~] .S3Key:
 │       ├─ [-] 0a1b.zip
 │       └─ [+] 2c3d.zip
 └─ [~] Metadata
     └─ [~] .aws:asset:path:
         ├─ [-] asset.0a1b
         └─ [+] asset.2c3d
[~] AWS::Lambda::Function NotifyFn NotifyFn11AA22BB
 └─ [~] Code
     └─ [~] .S3Key:
         ├─ [-] 4e5f.zip
         └─ [+] 6a7b.zip


✨  Number of stacks with differences: 1
`;

describe('the production workers diff guard', () => {
  it('passes a diff of functions whose code changed', () => {
    expect(notLambdaCode(codeOnly)).toEqual([]);
    expect(hasChanges(codeOnly)).toBe(true);
  });

  it('passes an empty diff, with nothing to deploy', () => {
    const none = 'Stack Production/Workers (Prod-Workers)\nThere were no differences\n';
    expect(notLambdaCode(none)).toEqual([]);
    expect(hasChanges(none)).toBe(false);
  });

  it('reads through colour codes', () => {
    const esc = String.fromCharCode(27);
    expect(notLambdaCode(`${esc}[33m[~]${esc}[39m AWS::SQS::Queue Q Q1\n`)).toHaveLength(1);
  });

  it.each([
    ['a function environment', '[~] AWS::Lambda::Function Fn Fn1\n └─ [~] Environment\n'],
    ['a function replaced', '[~] AWS::Lambda::Function Fn Fn1 replace\n └─ [~] Code\n'],
    ['a new function', '[+] AWS::Lambda::Function Fn Fn1\n'],
    ['a queue', '[~] AWS::SQS::Queue Q Q1\n └─ [~] VisibilityTimeout\n'],
    ['an alarm removed', '[-] AWS::CloudWatch::Alarm A A1 destroy\n'],
    ['IAM', 'IAM Statement Changes\n┌───┬──────┐\n'],
  ])('stops %s', (_, diff) => {
    expect(notLambdaCode(diff).length).toBeGreaterThan(0);
  });
});
