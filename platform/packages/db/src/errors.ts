export class QuotaExceeded extends Error {
  constructor(readonly resetAt: Date) {
    super('quota_exceeded');
  }
}

// Admin repository called by a user who isn't an admin (defence in depth behind route auth).
export class NotAdmin extends Error {
  constructor() {
    super('not_admin');
  }
}
