export const BLOCK_DURATION_MINUTES = 15;
export const MAX_FAILED_ATTEMPTS = 3;
export const ALLOWED_DURATIONS = [30, 60, 90] as const;
export type SessionDuration = (typeof ALLOWED_DURATIONS)[number];

/** Default rate per minute when no BillingRate exists in DB */
export const DEFAULT_RATE_PER_MINUTE = 1;
