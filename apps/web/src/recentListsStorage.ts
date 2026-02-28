import { createLocalStorageStore, parseStoredArray } from './localStorageStore'

export type RecentTaskListStorageEntry = {
  title: string
  boardId: string
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

  return {
    title: candidate.title,
    boardId: candidate.boardId,
  }
}

const recentListsStore = createLocalStorageStore<RecentTaskListStorageEntry[]>({
  key: RECENT_LISTS_STORAGE_KEY,
  parse: (value) => parseStoredArray(value, parseRecentTaskListStorageEntry, { requireNonEmpty: true }),
  serialize: (recentLists) => recentLists.map(({ title, boardId }) => ({ title, boardId })),
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
 * Only `title` and `boardId` are serialized.
 *
 * @param recentLists Recent list entries to persist.
 */
export function saveRecentListsToStorage(recentLists: RecentTaskListStorageEntry[]): void {
  recentListsStore.save(recentLists)
}
