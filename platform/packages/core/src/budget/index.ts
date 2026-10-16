// Global daily spend breaker per model family (SEC-03), in micro-dollars. When a family's spend
// for the UTC day reaches its limit the API refuses new paid jobs with 503 capacity.
export const DAILY_BUDGET_MICROS: Record<string, number> = {
  'gemini-flash-lite': 20_000_000,
  'gemini-flash': 50_000_000,
  'gemini-image': 150_000_000,
  'gemini-image-lite': 100_000_000,
};

export const DEFAULT_DAILY_BUDGET_MICROS = 10_000_000;

export function dailyBudgetMicros(family: string): number {
  return DAILY_BUDGET_MICROS[family] ?? DEFAULT_DAILY_BUDGET_MICROS;
}
