const https = require('https');
const crypto = require('crypto');
const pool = require('../db');

let cachedCapiConfig = null;
let cachedCapiTime = 0;
const CAPI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes RAM cache

function invalidateMetaCapiCache() {
  cachedCapiConfig = null;
  cachedCapiTime = 0;
}

async function getMetaCapiConfig(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedCapiConfig && (now - cachedCapiTime < CAPI_CACHE_TTL)) {
    return cachedCapiConfig;
  }

  try {
    const { rows } = await pool.query('SELECT meta_capi FROM public.site_settings WHERE id = 1 LIMIT 1');
    const dbConfig = (rows && rows[0] && rows[0].meta_capi && typeof rows[0].meta_capi === 'object')
      ? rows[0].meta_capi
      : {};

    cachedCapiConfig = {
      enabled: dbConfig.enabled !== undefined ? Boolean(dbConfig.enabled) : true,
      dataset_id: String(dbConfig.dataset_id || process.env.META_PIXEL_ID || '1085677903485810').trim(),
      access_token: String(dbConfig.access_token || process.env.META_CAPI_ACCESS_TOKEN || '').trim(),
      currency: String(dbConfig.currency || 'DZD').trim().toUpperCase(),
      test_event_code: String(dbConfig.test_event_code || '').trim()
    };
    cachedCapiTime = now;
    return cachedCapiConfig;
  } catch (err) {
    console.warn('[Meta CAPI] Error loading config from DB:', err.message);
    return {
      enabled: Boolean(process.env.META_CAPI_ACCESS_TOKEN),
      dataset_id: String(process.env.META_PIXEL_ID || '1085677903485810').trim(),
      access_token: String(process.env.META_CAPI_ACCESS_TOKEN || '').trim(),
      currency: 'DZD',
      test_event_code: ''
    };
  }
}

function sha256Hash(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim().toLowerCase();
  if (!cleaned) return null;
  return crypto.createHash('sha256').update(cleaned, 'utf8').digest('hex');
}

function normalizeAndHashPhone(rawPhone) {
  if (!rawPhone) return null;
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 10) {
    // Algerian local mobile/landline format: 05XXXXXXXX -> 2135XXXXXXXX
    digits = '213' + digits.slice(1);
  } else if (digits.length === 9 && /^[567]/.test(digits)) {
    digits = '213' + digits;
  }
  return sha256Hash(digits);
}

function extractClientIp(req) {
  if (!req || !req.headers) return undefined;
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).split(',')[0].trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim();
  return req.socket?.remoteAddress || req.ip || undefined;
}

/**
 * Send an event directly from the server to Meta Conversions API (Graph API v20.0)
 */
async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  req,
  userData = {},
  customData = {},
  testEventCode
}) {
  try {
    const config = await getMetaCapiConfig();
    if (!config.enabled || !config.dataset_id || !config.access_token) {
      return { skipped: true, reason: 'Meta CAPI disabled or missing credentials' };
    }

    const clientIp = userData.client_ip_address || extractClientIp(req);
    const clientUa = userData.client_user_agent || (req && req.headers ? req.headers['user-agent'] : undefined);
    const fbp = userData.fbp || (req && req.cookies ? req.cookies._fbp : undefined);
    const fbc = userData.fbc || (req && req.cookies ? req.cookies._fbc : undefined);

    const formattedUserData = {
      country: [sha256Hash(userData.country || 'dz')]
    };

    const hashedPhone = normalizeAndHashPhone(userData.phone || userData.ph);
    if (hashedPhone) formattedUserData.ph = [hashedPhone];

    const hashedEmail = sha256Hash(userData.email || userData.em);
    if (hashedEmail) formattedUserData.em = [hashedEmail];

    const hashedFirstName = sha256Hash(userData.firstName || userData.fn);
    if (hashedFirstName) formattedUserData.fn = [hashedFirstName];

    const hashedLastName = sha256Hash(userData.lastName || userData.ln);
    if (hashedLastName) formattedUserData.ln = [hashedLastName];

    const hashedCity = sha256Hash(userData.city || userData.ct);
    if (hashedCity) {
      formattedUserData.ct = [hashedCity];
      formattedUserData.st = [hashedCity];
    }

    if (userData.external_id) {
      formattedUserData.external_id = [sha256Hash(userData.external_id)];
    }

    if (clientIp) formattedUserData.client_ip_address = clientIp;
    if (clientUa) formattedUserData.client_user_agent = clientUa;
    if (fbp) formattedUserData.fbp = fbp;
    if (fbc) formattedUserData.fbc = fbc;

    const eventObj = {
      event_name: eventName || 'PageView',
      event_time: eventTime || Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: eventSourceUrl || (req && req.headers && req.headers.referer) || 'https://omervita.com/',
      user_data: formattedUserData
    };

    if (eventId) {
      eventObj.event_id = String(eventId);
    }

    if (customData && Object.keys(customData).length > 0) {
      const cleanCustom = { ...customData };
      if (cleanCustom.value !== undefined) {
        cleanCustom.value = Number(parseFloat(cleanCustom.value || 0).toFixed(2));
        cleanCustom.currency = String(cleanCustom.currency || config.currency || 'DZD').toUpperCase();
      }
      eventObj.custom_data = cleanCustom;
    }

    const bodyObj = {
      data: [eventObj]
    };

    const activeTestCode = testEventCode !== undefined ? testEventCode : config.test_event_code;
    if (activeTestCode && String(activeTestCode).trim()) {
      bodyObj.test_event_code = String(activeTestCode).trim();
    }

    const payload = JSON.stringify(bodyObj);
    const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(config.dataset_id)}/events?access_token=${encodeURIComponent(config.access_token)}`;

    return await new Promise((resolve) => {
      const request = https.request(endpoint, {
        method: 'POST',
        timeout: 6000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, response: parsed });
          } catch (_) {
            resolve({ status: res.statusCode, ok: false, raw: responseBody });
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({ ok: false, error: 'Meta CAPI request timeout' });
      });

      request.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });

      request.write(payload);
      request.end();
    });
  } catch (err) {
    console.warn('[Meta CAPI] Unexpected error:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getMetaCapiConfig,
  invalidateMetaCapiCache,
  sendMetaCapiEvent,
  sha256Hash,
  normalizeAndHashPhone
};

