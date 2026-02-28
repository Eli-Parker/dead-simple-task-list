export type LocalStorageParser<TValue> = (parsed: unknown) => TValue | null

export type LocalStorageSerializer<TValue> = (value: TValue) => unknown

export type LocalStorageArrayItemParser<TItem> = (value: unknown) => TItem | null

export type LocalStorageStore<TValue> = {
  key: string
  load: (fallback: TValue) => TValue
  save: (value: TValue) => void
  remove: () => void
}

type LocalStorageStoreOptions<TValue> = {
  key: string
  parse: LocalStorageParser<TValue>
  serialize?: LocalStorageSerializer<TValue>
}

type ParseStoredArrayOptions = {
  requireNonEmpty?: boolean
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  if (typeof window.localStorage === 'undefined') return null
  return window.localStorage
}

/**
 * Parses an unknown value into a typed array using an item parser.
 *
 * @param value Parsed JSON value from storage.
 * @param parseItem Item parser/normalizer for each array element.
 * @param options Parsing behavior options.
 * @returns Normalized array or `null` when the input shape is invalid.
 */
export function parseStoredArray<TItem>(
  value: unknown,
  parseItem: LocalStorageArrayItemParser<TItem>,
  { requireNonEmpty = false }: ParseStoredArrayOptions = {},
): TItem[] | null {
  if (!Array.isArray(value)) return null

  const normalized = value
    .map(parseItem)
    .filter((entry): entry is TItem => entry !== null)

  if (requireNonEmpty && normalized.length === 0) return null
  return normalized
}

/**
 * Creates a typed local-storage adapter with pluggable parse/serialize logic.
 *
 * @param options Store configuration and runtime guards.
 * @returns Store API for loading/saving/removing JSON values.
 */
export function createLocalStorageStore<TValue>({
  key,
  parse,
  serialize = (value) => value,
}: LocalStorageStoreOptions<TValue>): LocalStorageStore<TValue> {
  return {
    key,
    load(fallback: TValue): TValue {
      try {
        const storage = getLocalStorage()
        if (!storage) return fallback

        const rawValue = storage.getItem(key)
        if (!rawValue) return fallback

        const parsed = JSON.parse(rawValue)
        const normalized = parse(parsed)
        return normalized === null ? fallback : normalized
      } catch {
        return fallback
      }
    },
    save(value: TValue): void {
      try {
        const storage = getLocalStorage()
        if (!storage) return

        storage.setItem(key, JSON.stringify(serialize(value)))
      } catch {
        // Swallow storage errors (quota, privacy mode, serialization issues).
      }
    },
    remove(): void {
      try {
        const storage = getLocalStorage()
        if (!storage) return

        storage.removeItem(key)
      } catch {
        // Ignore storage removal errors.
      }
    },
  }
}
