const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { getMetaCapiConfig, invalidateMetaCapiCache, sendMetaCapiEvent } = require('../utils/meta-capi');

const OMV_CAPI_CLIENT_HELPER = `<script id="omv-meta-capi-helper">
(function() {
  if (window.__omv_capi_helper_loaded__) return;
  window.__omv_capi_helper_loaded__ = true;

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\\[\\]\\\\/+^])/g, '\\\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function setCookie(name, val, maxAgeSec) {
    document.cookie = name + '=' + val + '; path=/; max-age=' + (maxAgeSec || 7776000) + '; SameSite=Lax';
  }

  // Meta Parameter Builder Client-Side Best Practices:
  // 1. Capture fbclid from URL immediately into _fbc cookie (preserving exact case-sensitivity!)
  // 2. Ensure _fbp browser ID cookie exists immediately on landing (even if ad-blocker delays fbevents.js)
  // 3. Ensure persistent external_id (_omv_ext_id) exists for cross-session matching
  try {
    var searchStr = window.location.search || '';
    var fbclidMatch = searchStr.match(/[?&]fbclid=([^&#]+)/);
    if (fbclidMatch && fbclidMatch[1]) {
      var rawFbclid = decodeURIComponent(fbclidMatch[1]);
      var existingFbc = getCookie('_fbc');
      if (!existingFbc || existingFbc.indexOf(rawFbclid) === -1) {
        setCookie('_fbc', 'fb.1.' + Date.now() + '.' + rawFbclid, 7776000);
      }
    }
    if (!getCookie('_fbp')) {
      var rand10 = Math.floor(1000000000 + Math.random() * 9000000000);
      setCookie('_fbp', 'fb.1.' + Date.now() + '.' + rand10, 7776000);
    }
    if (!getCookie('_omv_ext_id')) {
      var extId = 'omv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      setCookie('_omv_ext_id', extId, 31536000);
    }
  } catch (_) {}

  window.omvGetMetaBrowserIds = function() {
    return {
      fbp: getCookie('_fbp') || undefined,
      fbc: getCookie('_fbc') || undefined,
      external_id: getCookie('_omv_ext_id') || undefined,
      referrer_url: document.referrer || undefined
    };
  };

  window.omvTrackMetaEvent = function(eventName, customData, userData, explicitEventId, skipServerPost) {
    try {
      var evId = explicitEventId || (eventName.toLowerCase() + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
      if (typeof window.fbq === 'function') {
        window.fbq('track', eventName, customData || {}, { eventID: evId });
      }
      if (!skipServerPost) {
        var ids = window.omvGetMetaBrowserIds();
        var payload = {
          eventName: eventName,
          eventId: evId,
          eventSourceUrl: window.location.href,
          referrerUrl: document.referrer || undefined,
          customData: customData || {},
          userData: Object.assign({}, userData || {}, ids)
        };
        fetch('/api/capi/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function() {});
      }
      return evId;
    } catch (_) {
      return null;
    }
  };

  // Send server-side PageView CAPI event once per page load (skip on admin pages)
  if ((window.location.pathname || '').indexOf('/admin') !== 0) {
    setTimeout(function() {
      var ids = window.omvGetMetaBrowserIds();
      fetch('/api/capi/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'PageView',
          eventId: 'pv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          eventSourceUrl: window.location.href,
          referrerUrl: document.referrer || undefined,
          userData: ids
        }),
        keepalive: true
      }).catch(function() {});
    }, 350);
  }
})();
</script>`;

// Cache for compiled scripts to avoid database queries on every page view
let scriptsCache = {
  headScripts: null,
  bodyScripts: null,
  lastUpdated: 0
};

function invalidateTrackingCache() {
  scriptsCache = { headScripts: null, bodyScripts: null, lastUpdated: 0 };
}

async function getCompiledTrackingScripts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && scriptsCache.headScripts !== null && (now - scriptsCache.lastUpdated < 30000)) {
    return scriptsCache;
  }

  try {
    const { rows } = await pool.query(
      'SELECT placement, script_code FROM public."TrackingScripts" WHERE is_active = true ORDER BY id ASC'
    );
    const head = [];
    const body = [];
    rows.forEach(r => {
      const code = (r.script_code || '').trim();
      if (!code) return;
      if (r.placement === 'body' || r.placement === 'body_end' || r.placement === 'body_start') {
        body.push(code);
      } else {
        head.push(code);
      }
    });
    head.push(OMV_CAPI_CLIENT_HELPER);
    scriptsCache = {
      headScripts: head.join('\n\n'),
      bodyScripts: body.join('\n\n'),
      lastUpdated: now
    };
    return scriptsCache;
  } catch (err) {
    console.error('Error compiling tracking scripts:', err);
    return { headScripts: '', bodyScripts: '', lastUpdated: now };
  }
}

// Helper: Verify Admin Token
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'ممنوع - للمشرفين فقط' });
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'رمز غير صالح أو منتهي الصلاحية' });
  }
}

// --------------------------------------------------------------------------
// 1. PUBLIC: GET /api/tracking-scripts
// Returns active tracking scripts
// --------------------------------------------------------------------------
router.get('/tracking-scripts', async (req, res) => {
  try {
    const { rows: scripts } = await pool.query(
      'SELECT id, name, code_type, placement, script_code FROM public."TrackingScripts" WHERE is_active = true ORDER BY id ASC'
    );
    res.json({ success: true, scripts });
  } catch (err) {
    console.error('Error fetching public tracking scripts:', err);
    res.status(500).json({ error: 'خطأ في جلب أكواد التتبع' });
  }
});

// --------------------------------------------------------------------------
// 2. PUBLIC: GET /api/tracking-scripts/loader.js
// Client-side loader script
// --------------------------------------------------------------------------
router.get('/tracking-scripts/loader.js', async (req, res) => {
  try {
    const { rows: scripts } = await pool.query(
      'SELECT id, name, code_type, placement, script_code FROM public."TrackingScripts" WHERE is_active = true ORDER BY id ASC'
    );

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute browser cache

    let jsCode = `(function() {
      // Omervita Custom Tracking Loader
      if (window.__omervita_tracking_loaded__) return;
      window.__omervita_tracking_loaded__ = true;
      const scripts = ${JSON.stringify(scripts)};
      
      scripts.forEach(function(item) {
        try {
          if (!item.script_code) return;
          const div = document.createElement('div');
          div.innerHTML = item.script_code;
          
          const scriptTags = div.querySelectorAll('script');
          scriptTags.forEach(function(oldScript) {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(function(attr) {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            (item.placement === 'body' || item.placement === 'body_end' ? document.body : document.head).appendChild(newScript);
          });

          // Non-script tags (like <noscript> or <meta>)
          Array.from(div.children).forEach(function(child) {
            if (child.tagName.toLowerCase() !== 'script') {
              (item.placement === 'body' || item.placement === 'body_end' ? document.body : document.head).appendChild(child);
            }
          });
        } catch (e) {
          console.warn('Error injecting tracking script ' + item.name + ':', e);
        }
      });
    })();`;

    res.send(jsCode);
  } catch (err) {
    console.error('Error generating tracking loader.js:', err);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send('/* Error loading tracking scripts */');
  }
});

// --------------------------------------------------------------------------
// 3. ADMIN: GET /api/admin/tracking-scripts
// Returns all tracking scripts
// --------------------------------------------------------------------------
router.get('/admin/tracking-scripts', verifyAdminToken, async (req, res) => {
  try {
    const { rows: scripts } = await pool.query(
      'SELECT * FROM public."TrackingScripts" ORDER BY id ASC'
    );
    res.json({ success: true, scripts });
  } catch (err) {
    console.error('Error fetching admin tracking scripts:', err);
    res.status(500).json({ error: 'خطأ في جلب أكواد التتبع', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. ADMIN: POST /api/admin/tracking-scripts
// Add new tracking script
// --------------------------------------------------------------------------
router.post('/admin/tracking-scripts', verifyAdminToken, async (req, res) => {
  const { name, code_type, placement, script_code, is_active } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'اسم كود التتبع مطلوب (مثال: Meta Pixel، TikTok Pixel).' });
  }
  if (!script_code || typeof script_code !== 'string' || !script_code.trim()) {
    return res.status(400).json({ error: 'محتوى الكود البرمجي مطلوب.' });
  }

  const cleanName = name.trim();
  const cleanType = (code_type || 'custom').trim();
  const cleanPlacement = (placement === 'body' || placement === 'body_end') ? 'body_end' : 'head';
  const cleanCode = script_code.trim();
  const activeStatus = is_active !== undefined ? Boolean(is_active) : true;

  try {
    const { rows } = await pool.query(`
      INSERT INTO public."TrackingScripts" (name, code_type, placement, script_code, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `, [cleanName, cleanType, cleanPlacement, cleanCode, activeStatus]);

    invalidateTrackingCache();
    res.json({ message: 'تمت إضافة كود التتبع بنجاح!', script: rows[0] });
  } catch (err) {
    console.error('Error creating tracking script:', err);
    res.status(500).json({ error: 'خطأ في حفظ كود التتبع', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. ADMIN: PUT /api/admin/tracking-scripts/:id
// Update tracking script
// --------------------------------------------------------------------------
router.put('/admin/tracking-scripts/:id', verifyAdminToken, async (req, res) => {
  const scriptId = parseInt(req.params.id, 10);
  const { name, code_type, placement, script_code, is_active } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name.trim()); }
    if (code_type !== undefined) { fields.push(`code_type = $${idx++}`); values.push(code_type.trim()); }
    if (placement !== undefined) { 
      const cleanPlacement = (placement === 'body' || placement === 'body_end') ? 'body_end' : 'head';
      fields.push(`placement = $${idx++}`); 
      values.push(cleanPlacement); 
    }
    if (script_code !== undefined) { fields.push(`script_code = $${idx++}`); values.push(script_code.trim()); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(Boolean(is_active)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'لا توجد بيانات للتعديل.' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(scriptId);

    const { rows: updated } = await pool.query(
      `UPDATE public."TrackingScripts" SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: 'كود التتبع غير موجود.' });
    }

    invalidateTrackingCache();
    res.json({ message: 'تم تحديث كود التتبع بنجاح!', script: updated[0] });
  } catch (err) {
    console.error('Error updating tracking script:', err);
    res.status(500).json({ error: 'خطأ في تحديث كود التتبع', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. ADMIN: PUT /api/admin/tracking-scripts/:id/toggle
// Toggle active/inactive
// --------------------------------------------------------------------------
router.put('/admin/tracking-scripts/:id/toggle', verifyAdminToken, async (req, res) => {
  const scriptId = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query(
      `UPDATE public."TrackingScripts" 
       SET is_active = NOT is_active, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [scriptId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'كود التتبع غير موجود.' });
    }

    invalidateTrackingCache();
    res.json({ 
      message: rows[0].is_active ? 'تم تفعيل كود التتبع بنجاح!' : 'تم تعطيل كود التتبع وإيقافه مؤقتاً.',
      script: rows[0] 
    });
  } catch (err) {
    console.error('Error toggling tracking script:', err);
    res.status(500).json({ error: 'خطأ في تعديل حالة الكود', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. ADMIN: DELETE /api/admin/tracking-scripts/:id
// Delete tracking script
// --------------------------------------------------------------------------
router.delete('/admin/tracking-scripts/:id', verifyAdminToken, async (req, res) => {
  const scriptId = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query(
      'DELETE FROM public."TrackingScripts" WHERE id = $1 RETURNING *',
      [scriptId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'كود التتبع غير موجود.' });
    }

    invalidateTrackingCache();
    res.json({ message: 'تم حذف كود التتبع بنجاح!' });
  } catch (err) {
    console.error('Error deleting tracking script:', err);
    res.status(500).json({ error: 'خطأ في حذف كود التتبع', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. PUBLIC: POST /api/capi/event
// Receives browser events (PageView, ViewContent, AddToCart, InitiateCheckout) and forwards to Meta CAPI
// --------------------------------------------------------------------------
router.post('/capi/event', async (req, res) => {
  const { eventName, eventId, eventSourceUrl, referrerUrl, customData, userData } = req.body || {};
  // Save client IP in _fbi cookie as recommended by Meta Parameter Builder
  try {
    const { extractClientIp } = require('../utils/meta-capi');
    const ip = extractClientIp && extractClientIp(req);
    if (ip && (!req.cookies || !req.cookies._fbi)) {
      res.cookie('_fbi', ip, { maxAge: 90 * 24 * 60 * 60 * 1000, httpOnly: false, sameSite: 'Lax', path: '/' });
    }
  } catch (_) {}
  // Respond immediately so browser is never delayed
  res.status(202).json({ queued: true });

  setImmediate(async () => {
    try {
      await sendMetaCapiEvent({
        eventName: eventName || 'PageView',
        eventId,
        eventSourceUrl: eventSourceUrl || req.headers.referer || 'https://omervita.com/',
        referrerUrl: referrerUrl || req.headers.referer || undefined,
        req,
        userData: userData || {},
        customData: customData || {}
      });
    } catch (_) {}
  });
});

// --------------------------------------------------------------------------
// 9. ADMIN: GET /api/admin/meta-capi
// Returns Meta Conversions API settings
// --------------------------------------------------------------------------
router.get('/admin/meta-capi', verifyAdminToken, async (req, res) => {
  try {
    const config = await getMetaCapiConfig(true);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب إعدادات Meta Conversions API', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 10. ADMIN: POST /api/admin/meta-capi
// Updates Meta Conversions API settings in site_settings
// --------------------------------------------------------------------------
router.post('/admin/meta-capi', verifyAdminToken, async (req, res) => {
  try {
    const { enabled, dataset_id, access_token, currency, test_event_code } = req.body || {};
    const current = await getMetaCapiConfig(true);

    const newConfig = {
      enabled: enabled !== undefined ? Boolean(enabled) : current.enabled,
      dataset_id: dataset_id !== undefined ? String(dataset_id).trim() : current.dataset_id,
      access_token: access_token !== undefined ? String(access_token).trim() : current.access_token,
      currency: currency !== undefined ? String(currency).trim().toUpperCase() : (current.currency || 'DZD'),
      test_event_code: test_event_code !== undefined ? String(test_event_code).trim() : (current.test_event_code || '')
    };

    await pool.query(
      'UPDATE public.site_settings SET meta_capi = $1::jsonb WHERE id = 1',
      [JSON.stringify(newConfig)]
    );
    invalidateMetaCapiCache();
    invalidateTrackingCache();

    res.json({
      success: true,
      message: 'تم حفظ إعدادات Meta Conversions API بنجاح!',
      config: newConfig
    });
  } catch (err) {
    console.error('Error saving Meta CAPI config:', err);
    res.status(500).json({ error: 'خطأ في حفظ إعدادات Meta Conversions API', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 11. ADMIN: POST /api/admin/meta-capi/test
// Sends a live test event to Meta Graph API and returns the result
// --------------------------------------------------------------------------
router.post('/admin/meta-capi/test', verifyAdminToken, async (req, res) => {
  try {
    const { eventName, testEventCode } = req.body || {};
    const result = await sendMetaCapiEvent({
      eventName: eventName || 'Purchase',
      eventId: 'admin_test_' + Date.now(),
      eventSourceUrl: 'https://omervita.com/',
      req,
      testEventCode,
      userData: {
        phone: '0555123456',
        firstName: 'Omervita',
        lastName: 'Customer',
        city: 'Algiers'
      },
      customData: {
        currency: 'DZD',
        value: 3500,
        content_name: 'اختبار ربط Meta Conversions API',
        content_type: 'product'
      }
    });

    if (result && result.ok) {
      return res.json({
        success: true,
        message: 'تم إرسال الحدث التجريبي إلى فيسبوك بنجاح! (Events Received: ' + (result.response?.events_received || 1) + ')',
        metaResponse: result.response
      });
    }
    return res.status(400).json({
      success: false,
      error: result?.response?.error?.message || result?.error || 'فشل إرسال الحدث التجريبي إلى فيسبوك',
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ أثناء اختبار Meta Conversions API', details: err.message });
  }
});

module.exports = {
  router,
  getCompiledTrackingScripts,
  invalidateTrackingCache
};
