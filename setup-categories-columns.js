const path = require('path');
require(path.resolve(process.cwd(), 'node_modules/dotenv')).config();
const pool = require(path.resolve(process.cwd(), 'db'));

async function setupCategoriesColumns() {
  try {
    console.log('Adding new columns to Categories table if they do not exist...');

    await pool.query(`
      ALTER TABLE public."Categories" 
      ADD COLUMN IF NOT EXISTS icon VARCHAR(100) DEFAULT 'bi-tag',
      ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'primary',
      ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    console.log('Columns added or verified successfully.');

    // Populate initial icons and display orders for existing categories
    const initialConfig = [
      { id: 2, name: 'عناية بالبشرة', icon: 'bi-droplet-half', color: 'pink', display_order: 1 },
      { id: 4, name: 'زيوت أساسية', icon: 'bi-eyedropper', color: 'orange', display_order: 2 },
      { id: 5, name: 'زيوت نباتية', icon: 'bi-eyedropper', color: 'info', display_order: 3 },
      { id: 1, name: 'عناية بالشعر', icon: 'bi-scissors', color: 'orange', display_order: 4 },
      { id: 3, name: 'أغذية صحية', icon: 'bi-capsule', color: 'green', display_order: 5 }
    ];

    for (const item of initialConfig) {
      await pool.query(`
        UPDATE public."Categories" 
        SET icon = $1, color = $2, display_order = $3, is_active = true 
        WHERE id = $4;
      `, [item.icon, item.color, item.display_order, item.id]);
    }

    console.log('Initial category icons and display orders updated!');

    // Grant permissions on Categories table
    await pool.query(`
      GRANT ALL ON TABLE public."Categories" TO anon, authenticated, service_role;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    `);

    // Verify
    const { rows } = await pool.query('SELECT * FROM public."Categories" ORDER BY display_order ASC, id ASC');
    console.log('Updated Categories list:', rows);
  } catch (err) {
    console.error('Error during Categories setup:', err);
  } finally {
    await pool.end();
  }
}

setupCategoriesColumns();
