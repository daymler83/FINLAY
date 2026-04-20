import type { SyncedProUser } from './proSubscription'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  value: SyncedProUser
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCachedUser(userId: string): SyncedProUser | null {
  const entry = cache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId)
    return null
  }
  return entry.value
}

export function setCachedUser(userId: string, user: SyncedProUser): void {
  cache.set(userId, { value: user, expiresAt: Date.now() + TTL_MS })
}

export function invalidateCachedUser(userId: string): void {
  cache.delete(userId)
}
