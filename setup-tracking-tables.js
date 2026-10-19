const path = require('path');
require(path.resolve(process.cwd(), 'node_modules/dotenv')).config();
const pool = require(path.resolve(process.cwd(), 'db'));

const INITIAL_SCRIPTS = [
  {
    name: 'Google Analytics (GA4) & Google Tag',
    code_type: 'google_tag',
    placement: 'head',
    script_code: `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WZM00X5FSE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-WZM00X5FSE');
</script>`,
    is_active: true
  },
  {
    name: 'Meta Pixel (Facebook)',
    code_type: 'meta_pixel',
    placement: 'head',
    script_code: `<!-- Meta Pixel Code -->
<script>
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ?
        n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
    n.queue = []; t = b.createElement(e); t.async = !0;
    t.src = v; s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s)
  }(window, document, 'script',
    'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1085677903485810');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=1085677903485810&ev=PageView&noscript=1" /></noscript>
<!-- End Meta Pixel Code -->`,
    is_active: true
  }
];

async function setupTrackingScriptsTable() {
  try {
    console.log('Creating TrackingScripts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public."TrackingScripts" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code_type VARCHAR(50) NOT NULL DEFAULT 'custom',
        placement VARCHAR(20) NOT NULL DEFAULT 'head',
        script_code TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await pool.query(`
      GRANT ALL ON TABLE public."TrackingScripts" TO anon, authenticated, service_role;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    `);

    // Check existing scripts
    const { rows: existing } = await pool.query('SELECT * FROM public."TrackingScripts"');
    if (existing.length === 0) {
      console.log('Seeding initial scripts migrated from existing HTML files...');
      for (const s of INITIAL_SCRIPTS) {
        await pool.query(`
          INSERT INTO public."TrackingScripts" (name, code_type, placement, script_code, is_active)
          VALUES ($1, $2, $3, $4, $5);
        `, [s.name, s.code_type, s.placement, s.script_code, s.is_active]);
      }
      console.log('Successfully seeded existing tracking codes!');
    } else {
      console.log(`Found ${existing.length} existing tracking scripts.`);
    }

    const { rows: verify } = await pool.query('SELECT id, name, code_type, placement, is_active FROM public."TrackingScripts"');
    console.log('Tracking scripts in DB:', verify);
  } catch (err) {
    console.error('Error setting up TrackingScripts table:', err);
  } finally {
    await pool.end();
  }
}

setupTrackingScriptsTable();
