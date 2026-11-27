// ADR-022 / ios-release.md §2: production's workers deploy by themselves only when `cdk diff
// 'Production/Workers'` shows nothing but the functions' code. Anything else (IAM, queues,
// alarms, environment, a replacement) waits for a person. Returns the lines that are not code.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
// Sections that only ever print when something other than a resource's properties changes.
const SECTIONS =
  /^(IAM Statement Changes|IAM Policy Changes|Security Group Changes|Parameters|Conditions|Mappings|Outputs|Other Changes)\b/;

export function notLambdaCode(diff: string): string[] {
  const bad: string[] = [];
  for (const raw of diff.split('\n')) {
    const line = raw.replace(ANSI, '').trimEnd();
    if (SECTIONS.test(line)) bad.push(line);
    // A resource: only an updated (never added, removed or replaced) Lambda function.
    else if (/^\[[+\-~]\] /.test(line)) {
      if (!/^\[~\] AWS::Lambda::Function \S+ \S+$/.test(line)) bad.push(line);
    }
    // A resource's own property: its code, and the asset path CDK records beside it.
    else if (/^ [├└]─ \[[+\-~]\] /.test(line)) {
      if (!/^ [├└]─ \[~\] (Code|Metadata)$/.test(line)) bad.push(line);
    }
  }
  return bad;
}

// True when the diff found any change at all, so an empty diff skips the deploy.
export function hasChanges(diff: string): boolean {
  return /^\[[+\-~]\] /m.test(diff.replace(ANSI, ''));
}
