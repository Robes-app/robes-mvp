import axe from 'axe-core';

// Zero serious/critical violations (ux-opportunities.md §4.4). Colour contrast is covered by the
// tokens contrast test; jsdom can't compute it.
export async function seriousViolations(node: Element = document.body): Promise<string[]> {
  const result = await axe.run(node, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
