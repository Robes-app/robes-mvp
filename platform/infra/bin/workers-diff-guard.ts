// Reads `cdk diff 'Production/Workers'` on stdin. Exits 1 when it holds anything but Lambda code
// (printing why), else prints `changed=true|false` for GitHub Actions' $GITHUB_OUTPUT.
import { readFileSync } from 'node:fs';
import { hasChanges, notLambdaCode } from '../src/lib/diff-guard';

const diff = readFileSync(0, 'utf8');
const bad = notLambdaCode(diff);
if (bad.length > 0) {
  console.error(
    'The workers diff holds more than Lambda code; deploy it by hand (ios-release.md §2):',
  );
  for (const line of bad) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`changed=${hasChanges(diff)}`);
