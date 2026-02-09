import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get a cookie value by key (client-side only)
 * @param key - Cookie name
 * @returns Cookie value or undefined if not found
 */
function getCookie(key: string): string | undefined {
  if (typeof document === "undefined") {
    return;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${key}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return;
}

/**
 * Set a cookie value (client-side only)
 * @param key - Cookie name
 * @param value - Cookie value
 * @param maxAge - Cookie max age in seconds
 */
function setCookie(
  key: string,
  value: string,
  maxAge: number = COOKIE_MAX_AGE,
): void {
  if (typeof document !== "undefined") {
    // biome-ignore lint/suspicious/noDocumentCookie: lib code
    document.cookie = `${key}=${value}; path=/; max-age=${maxAge}`;
  }
}

/**
 * Delete a cookie (client-side only)
 * @param key - Cookie name
 */
function deleteCookie(key: string): void {
  if (typeof document !== "undefined") {
    // biome-ignore lint/suspicious/noDocumentCookie: lib code
    document.cookie = `${key}=; path=/; max-age=0`;
  }
}

/**
 * Serialize a value to a string for cookie storage
 * @param value - Value to serialize
 * @returns Serialized string
 */
function serialize<T>(value: T): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  if (typeof value === "number") {
    return value.toString();
  }
  // For objects/arrays, use JSON
  return JSON.stringify(value);
}

/**
 * Deserialize a string from cookie storage
 * @param value - String to deserialize
 * @returns Deserialized value
 */
function deserialize(value: string): unknown {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If it fails, return as-is (for simple strings)
    // Handle boolean strings
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    // Handle number strings
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return num;
    }
    return value;
  }
}

/**
 * Create a Jotai atom that syncs with cookies
 * Similar to atomWithStorage but uses cookies instead of localStorage
 *
 * The atom will:
 * 1. Read from cookie on initialization (synchronous, no flash)
 * 2. Fall back to initialValue if cookie doesn't exist
 * 3. Write to cookie on every update
 *
 * @param key - Cookie name (will be used as the storage key)
 * @param initialValue - Default value if cookie doesn't exist
 * @param maxAge - Cookie max age in seconds (default: 1 year)
 * @returns Jotai atom that syncs with cookies
 *
 * @example
 * ```ts
 * const myAtom = atomWithCookie('myKey', false)
 * const myAtom = atomWithCookie('myKey', { foo: 'bar' })
 * ```
 */
export function atomWithCookie<T>(
  key: string,
  initialValue: T,
  maxAge: number = COOKIE_MAX_AGE,
) {
  // Read cookie value synchronously on atom creation
  const getInitialValue = (): T => {
    const cookieValue = getCookie(key);
    if (cookieValue === undefined) {
      return initialValue;
    }
    return deserialize(cookieValue) as T;
  };

  return atomWithStorage<T>(key, getInitialValue(), {
    getItem: (storageKey: string, defaultValue: T): T => {
      const cookieValue = getCookie(storageKey);
      if (cookieValue === undefined) {
        return defaultValue;
      }
      return deserialize(cookieValue) as T;
    },
    removeItem: (storageKey: string): void => {
      deleteCookie(storageKey);
    },
    setItem: (storageKey: string, value: T): void => {
      setCookie(storageKey, serialize(value), maxAge);
    },
  });
}

/**
 * Server-side cookie reader helper for Next.js
 * Use this to read cookie values on the server for SSR/hydration
 *
 * @example
 * ```ts
 * import { cookies } from 'next/headers'
 *
 * const cookieStore = await cookies()
 * const value = getServerCookie(cookieStore, 'myKey', false)
 * ```
 */
export function getServerCookie<T>(
  cookieStore: Awaited<ReturnType<typeof import("next/headers").cookies>>,
  key: string,
  defaultValue: T,
): T {
  const cookie = cookieStore.get(key);
  if (!cookie?.value) {
    return defaultValue;
  }
  return deserialize(cookie.value) as T;
}

export const authTokenAtom = atomWithCookie<string | null>(
  "nurseAssistantAuthToken",
  null,
);
