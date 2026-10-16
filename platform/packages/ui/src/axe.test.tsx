import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';

it('the axe helper reports serious violations', async () => {
  render(<button type="button" />);
  expect((await seriousViolations()).join()).toMatch(/button-name/);
});
