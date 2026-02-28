export type RecentTaskListStorageEntry = {
  id: string
  title: string
  boardId: string
}

const RECENT_LISTS_STORAGE_KEY = 'dst_recent_lists'

/**
 * Parses an unknown value into a valid storage entry.
 *
 * Supports legacy entries that only include `id` and `title`,
 * and prior link-based entries by deriving a board ID.
 *
 * @param value Unknown parsed value.
 * @returns Normalized storage entry or `null` when invalid.
 */
function parseRecentTaskListStorageEntry(value: unknown): RecentTaskListStorageEntry | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<RecentTaskListStorageEntry> & { link?: unknown }
  if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') return null

  if (typeof candidate.boardId === 'string' && candidate.boardId.length > 0) {
    return {
      id: candidate.id,
      title: candidate.title,
      boardId: candidate.boardId,
    }
  }

  if (typeof candidate.link === 'string') {
    return {
      id: candidate.id,
      title: candidate.title,
      boardId: extractBoardIdFromLegacyLink(candidate.link) ?? candidate.id,
    }
  }

  return {
    id: candidate.id,
    title: candidate.title,
    boardId: candidate.id,
  }
}

/**
 * Extracts a board ID from a legacy link format.
 *
 * Supports legacy `/?{boardId}` links and `/board/{boardId}` paths.
 *
 * @param link Legacy URL or path string.
 * @returns Board ID when a known pattern is found; otherwise `null`.
 */
function extractBoardIdFromLegacyLink(link: string): string | null {
  try {
    const parsedLink = new URL(link, 'https://deadsimpletasks.app')
    if (parsedLink.search.length > 1 && !parsedLink.search.includes('=')) {
      return decodeURIComponent(parsedLink.search.slice(1))
    }

    const boardPathMatch = parsedLink.pathname.match(/^\/board\/([^/]+)$/)
    if (boardPathMatch?.[1]) {
      return decodeURIComponent(boardPathMatch[1])
    }
  } catch {
    return null
  }

  return null
}

/**
 * Loads recent task lists from browser local storage.
 *
 * Falls back to caller-provided values when storage is missing,
 * malformed, or does not contain a valid array shape.
 *
 * @param fallback Fallback entries returned when stored data is unusable.
 * @returns Array of recent list storage entries.
 */
export function loadRecentListsFromStorage(
  fallback: RecentTaskListStorageEntry[] = [],
): RecentTaskListStorageEntry[] {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return fallback

    const rawStoredValue = window.localStorage.getItem(RECENT_LISTS_STORAGE_KEY)
    if (!rawStoredValue) return fallback

    const parsed = JSON.parse(rawStoredValue)
    if (!Array.isArray(parsed)) return fallback

    const normalizedEntries = parsed
      .map(parseRecentTaskListStorageEntry)
      .filter((entry): entry is RecentTaskListStorageEntry => entry !== null)

    return normalizedEntries.length > 0 ? normalizedEntries : fallback
  } catch {
    return fallback
  }
}

/**
 * Persists recent task lists to browser local storage.
 *
 * Only `id`, `title`, and `boardId` are serialized.
 *
 * @param recentLists Recent list entries to persist.
 */
export function saveRecentListsToStorage(recentLists: RecentTaskListStorageEntry[]): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return

  const storagePayload = recentLists.map(({ id, title, boardId }) => ({ id, title, boardId }))
  window.localStorage.setItem(RECENT_LISTS_STORAGE_KEY, JSON.stringify(storagePayload))
}
