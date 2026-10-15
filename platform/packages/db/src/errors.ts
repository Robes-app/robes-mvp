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

// A brief list already holds BRIEF_KEPT_MAX kept lines (server safety cap; 409 conflict).
export class BriefListFull extends Error {
  constructor(readonly list: string) {
    super('brief_list_full');
  }
}
