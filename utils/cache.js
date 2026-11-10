/**
 * Smart Server-Side RAM Cache + Instant Admin Invalidation + Asset Cache Busting
 * - Visitors are served from server RAM in <1ms (zero repeated database queries).
 * - Repeat visitors receive 304 Not Modified via ETag (zero bandwidth wasted).
 * - Admin edits (POST/PUT/DELETE) immediately clear the RAM cache and bump the ETag,
 *   so changes appear in 0 seconds without waiting for browser/CDN cache expiration.
 */

const ASSET_VERSION = Date.now().toString(36);

const stores = {
  funnels: new Map(),
  products: new Map(),
  categories: new Map()
};

const versions = {
  funnels: 1,
  products: 1,
  categories: 1
};

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes in Server RAM

function invalidateCache(group) {
  if (stores[group]) {
    stores[group].clear();
    versions[group] = (versions[group] || 1) + 1;
  }
}

function invalidateFunnelsCache() {
  invalidateCache('funnels');
}

function invalidateProductsCache() {
  invalidateCache('products');
  invalidateCache('funnels'); // Funnel product_card blocks & offers reference products
}

function invalidateCategoriesCache() {
  invalidateCache('categories');
  invalidateCache('products');
}

/**
 * Serves JSON from Server RAM cache with ETag validation (`max-age=0, must-revalidate`).
 * Browsers and CDNs validate the ETag in ~1ms without hitting the database,
 * and immediately receive fresh data the moment an admin saves a change.
 */
async function sendCachedJson(req, res, group, key, fetcher, ttlMs = DEFAULT_TTL_MS) {
  const store = stores[group] || stores.funnels;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || (now - entry.timestamp > ttlMs)) {
    const data = await fetcher();
    if (data === undefined) return; // Fetcher handled response directly (e.g. 404)
    const ver = versions[group] || 1;
    const etag = `W/"${group}-${ver}-${now.toString(36)}"`;
    entry = { data, etag, timestamp: now };
    store.set(key, entry);
  }

  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
  res.setHeader('ETag', entry.etag);

  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === entry.etag) {
    return res.status(304).end();
  }

  return res.json(entry.data);
}

/**
 * Automatically stamps local /css/*.css and /js/*.js URLs in HTML with ?v=ASSET_VERSION
 * so Cloudflare and browsers cache static files for 7 days, yet fetch new code
 * immediately on every server deploy/restart.
 */
function injectAssetVersionIntoHtml(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(
    /\b(href|src)=(["'])(\/(?:css|js)\/[^"'?]+\.(?:css|js))(?:\?v=[^"']*)?\2/gi,
    `$1=$2$3?v=${ASSET_VERSION}$2`
  );
}

module.exports = {
  ASSET_VERSION,
  sendCachedJson,
  invalidateFunnelsCache,
  invalidateProductsCache,
  invalidateCategoriesCache,
  injectAssetVersionIntoHtml
};

