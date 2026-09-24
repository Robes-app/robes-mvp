export class QuotaExceeded extends Error {
  constructor(readonly resetAt: Date) {
    super('quota_exceeded');
  }
}
