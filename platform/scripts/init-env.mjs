import { copyFileSync, existsSync } from 'node:fs';

for (const dir of ['app']) {
  const target = new URL(`../${dir}/.env.local`, import.meta.url);
  if (existsSync(target)) continue;
  copyFileSync(new URL(`../${dir}/.env.example`, import.meta.url), target);
  console.log(`env: created ${dir}/.env.local from .env.example`);
}
