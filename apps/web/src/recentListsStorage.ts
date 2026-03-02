import { createLocalStorageStore, parseStoredArray } from './localStorageStore'

export type RecentTaskListStorageEntry = {
  title: string
  boardId: string
  storedAt: string | null
}

const RECENT_LISTS_STORAGE_KEY = 'dst_recent_lists'

/**
 * Parses an unknown value into a valid storage entry.
 *
 * @param value Unknown parsed value.
 * @returns Normalized storage entry or `null` when invalid.
 */
function parseRecentTaskListStorageEntry(value: unknown): RecentTaskListStorageEntry | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<RecentTaskListStorageEntry>
  if (
    typeof candidate.title !== 'string' ||
    typeof candidate.boardId !== 'string' ||
    candidate.boardId.length === 0
  ) {
    return null
  }

  const storedAt =
    typeof candidate.storedAt === 'string' && !Number.isNaN(Date.parse(candidate.storedAt))
      ? new Date(candidate.storedAt).toISOString()
      : null

  return {
    title: candidate.title,
    boardId: candidate.boardId,
    storedAt,
  }
}

const recentListsStore = createLocalStorageStore<RecentTaskListStorageEntry[]>({
  key: RECENT_LISTS_STORAGE_KEY,
  parse: (value) => parseStoredArray(value, parseRecentTaskListStorageEntry, { requireNonEmpty: true }),
  serialize: (recentLists) =>
    recentLists.map(({ title, boardId, storedAt }) => ({ title, boardId, storedAt })),
})

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
  return recentListsStore.load(fallback)
}

/**
 * Persists recent task lists to browser local storage.
 *
 * `title`, `boardId`, and `storedAt` are serialized.
 *
 * @param recentLists Recent list entries to persist.
 */
export function saveRecentListsToStorage(recentLists: RecentTaskListStorageEntry[]): void {
  recentListsStore.save(recentLists)
}
