/**
 * Cache policy for the public read endpoints (site content, session data, map
 * config). Vercel's CDN keeps each response for 15 s and may serve it up to
 * 60 s more while refreshing in the background — so on conference day the
 * database answers about once per endpoint every 15 s, however many visitors
 * there are (Neon's free plan suspends the database when its monthly compute
 * hours run out).
 *
 * The admin page must always read fresh data (its autosave writes back what it
 * loaded), so its requests add a unique `?fresh=` query, which skips the cache.
 */
export const PUBLIC_CACHE = "public, s-maxage=15, stale-while-revalidate=60";

/** Query suffix that bypasses the CDN cache (admin reads). */
export const fresh = (sep: "?" | "&" = "?") => `${sep}fresh=${Date.now()}`;
