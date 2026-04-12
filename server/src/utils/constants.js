module.exports = {
  SCRAPE_FREQUENCIES: {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    biweekly: 14 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  },
  STATUSES: {
    NEW: 'new',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
  },
  CHANGE_TYPES: {
    NEW_STAKEHOLDER: 'new_stakeholder',
    TITLE_CHANGE: 'title_change',
    DEPARTED: 'departed',
    REPORTS_TO_CHANGE: 'reports_to_change',
    RETURNED: 'returned',
  },
  JOB_STATUSES: {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },
  NEW_BADGE_EXPIRY_DAYS: 90,
  CONSECUTIVE_MISSES_THRESHOLD: 2,
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRY: '7d',
  PAGINATION_DEFAULT_LIMIT: 25,
};
