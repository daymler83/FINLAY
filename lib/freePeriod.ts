// Free period: all authenticated users get Pro-level catalog access
// AI chat limited to 5 queries per user regardless

// 2026-05-05 23:59 Chile time (UTC-4)
export const FREE_PERIOD_END = new Date('2026-05-06T03:59:00Z')
export const AI_FREE_LIMIT = 5

export function isFreePeriodActive(): boolean {
  return new Date() < FREE_PERIOD_END
}
