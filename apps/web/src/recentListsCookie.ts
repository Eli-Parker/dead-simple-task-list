export type RecentTaskListCookieEntry = {
  id: string
  name: string
}

const RECENT_LISTS_COOKIE = 'dst_recent_lists'
const RECENT_LISTS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Reads a cookie value by key from `document.cookie`.
 *
 * @param name Cookie key.
 * @returns Cookie value if found; otherwise `null`.
 */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const key = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((cookiePart) => cookiePart.startsWith(key))

  return cookie ? cookie.slice(key.length) : null
}

/**
 * Validates that an unknown value matches the cookie entry shape.
 *
 * @param value Unknown parsed value.
 * @returns `true` when the value has `id` and `name` string fields.
 */
function isRecentTaskListCookieEntry(value: unknown): value is RecentTaskListCookieEntry {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<RecentTaskListCookieEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string'
  )
}

/**
 * Loads recent task lists from the recent-lists cookie.
 *
 * Falls back to caller-provided values when the cookie is missing,
 * malformed, or does not contain a valid array shape.
 *
 * @param fallback Fallback entries returned when cookie data is unusable.
 * @returns Array of recent list cookie entries.
 */
export function loadRecentListsFromCookie(
  fallback: RecentTaskListCookieEntry[] = [],
): RecentTaskListCookieEntry[] {
  try {
    const rawCookieValue = readCookie(RECENT_LISTS_COOKIE)
    if (!rawCookieValue) return fallback

    const parsed = JSON.parse(decodeURIComponent(rawCookieValue))
    if (!Array.isArray(parsed)) return fallback

    return parsed.filter(isRecentTaskListCookieEntry)
  } catch {
    return fallback
  }
}

/**
 * Persists recent task lists to the recent-lists cookie.
 *
 * Only `id` and `name` are serialized to cookie storage.
 *
 * @param recentLists Recent list entries to persist.
 */
export function saveRecentListsToCookie(recentLists: RecentTaskListCookieEntry[]): void {
  if (typeof document === 'undefined') return

  const cookiePayload = recentLists.map(({ id, name }) => ({ id, name }))
  const encodedValue = encodeURIComponent(JSON.stringify(cookiePayload))
  document.cookie = `${RECENT_LISTS_COOKIE}=${encodedValue}; Max-Age=${RECENT_LISTS_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
}
