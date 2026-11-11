/** Prefix a /public path with the base path (needed when hosted in a sub-folder). */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function asset(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
