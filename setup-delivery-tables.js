require('dotenv').config();
const pool = require('./db');

// 58 Algerian Wilayas with official codes and default home & desk delivery prices
const DEFAULT_WILAYAS = [
  { code: "01", name: "Adrar", name_ar: "أدرار", home: 1200, desk: 800 },
  { code: "02", name: "Chlef", name_ar: "الشلف", home: 800, desk: 500 },
  { code: "03", name: "Laghouat", name_ar: "الأغواط", home: 1100, desk: 700 },
  { code: "04", name: "Oum El Bouaghi", name_ar: "أم البواقي", home: 800, desk: 500 },
  { code: "05", name: "Batna", name_ar: "باتنة", home: 800, desk: 500 },
  { code: "06", name: "Béjaïa", name_ar: "بجاية", home: 800, desk: 500 },
  { code: "07", name: "Biskra", name_ar: "بسكرة", home: 1100, desk: 700 },
  { code: "08", name: "Béchar", name_ar: "بشار", home: 1200, desk: 800 },
  { code: "09", name: "Blida", name_ar: "البليدة", home: 600, desk: 400 },
  { code: "10", name: "Bouira", name_ar: "البويرة", home: 800, desk: 500 },
  { code: "11", name: "Tamanrasset", name_ar: "تمنراست", home: 1950, desk: 1400 },
  { code: "12", name: "Tébessa", name_ar: "تبسة", home: 1100, desk: 700 },
  { code: "13", name: "Tlemcen", name_ar: "تلمسان", home: 800, desk: 500 },
  { code: "14", name: "Tiaret", name_ar: "تيارت", home: 800, desk: 500 },
  { code: "15", name: "Tizi Ouzou", name_ar: "تيزي وزو", home: 800, desk: 500 },
  { code: "16", name: "Algiers", name_ar: "الجزائر", home: 500, desk: 350 },
  { code: "17", name: "Djelfa", name_ar: "الجلفة", home: 1100, desk: 700 },
  { code: "18", name: "Jijel", name_ar: "جيجل", home: 800, desk: 500 },
  { code: "19", name: "Sétif", name_ar: "سطيف", home: 800, desk: 500 },
  { code: "20", name: "Saïda", name_ar: "سعيدة", home: 900, desk: 600 },
  { code: "21", name: "Skikda", name_ar: "سكيكدة", home: 900, desk: 600 },
  { code: "22", name: "Sidi Bel Abbès", name_ar: "سيدي بلعباس", home: 800, desk: 500 },
  { code: "23", name: "Annaba", name_ar: "عنابة", home: 800, desk: 500 },
  { code: "24", name: "Guelma", name_ar: "قالمة", home: 900, desk: 600 },
  { code: "25", name: "Constantine", name_ar: "قسنطينة", home: 800, desk: 500 },
  { code: "26", name: "Médéa", name_ar: "المدية", home: 800, desk: 500 },
  { code: "27", name: "Mostaganem", name_ar: "مستغانم", home: 800, desk: 500 },
  { code: "28", name: "M'Sila", name_ar: "المسيلة", home: 800, desk: 500 },
  { code: "29", name: "Mascara", name_ar: "معسكر", home: 800, desk: 500 },
  { code: "30", name: "Ouargla", name_ar: "ورقلة", home: 1100, desk: 700 },
  { code: "31", name: "Oran", name_ar: "وهران", home: 800, desk: 500 },
  { code: "32", name: "El Bayadh", name_ar: "البيض", home: 1200, desk: 800 },
  { code: "33", name: "Illizi", name_ar: "إليزي", home: 2000, desk: 1500 },
  { code: "34", name: "Bordj Bou Arréridj", name_ar: "برج بوعريريج", home: 800, desk: 500 },
  { code: "35", name: "Boumerdès", name_ar: "بومرداس", home: 600, desk: 400 },
  { code: "36", name: "El Tarf", name_ar: "الطارف", home: 900, desk: 600 },
  { code: "37", name: "Tindouf", name_ar: "تندوف", home: 1950, desk: 1400 },
  { code: "38", name: "Tissemsilt", name_ar: "تيسمسيلت", home: 900, desk: 600 },
  { code: "39", name: "El Oued", name_ar: "الوادي", home: 1100, desk: 700 },
  { code: "40", name: "Khenchela", name_ar: "خنشلة", home: 900, desk: 600 },
  { code: "41", name: "Souk Ahras", name_ar: "سوق أهراس", home: 900, desk: 600 },
  { code: "42", name: "Tipaza", name_ar: "تيبازة", home: 600, desk: 400 },
  { code: "43", name: "Mila", name_ar: "ميلة", home: 800, desk: 500 },
  { code: "44", name: "Aïn Defla", name_ar: "عين الدفلى", home: 800, desk: 500 },
  { code: "45", name: "Naâma", name_ar: "النعامة", home: 1200, desk: 800 },
  { code: "46", name: "Aïn Témouchent", name_ar: "عين تموشنت", home: 800, desk: 500 },
  { code: "47", name: "Ghardaïa", name_ar: "غرداية", home: 1100, desk: 700 },
  { code: "48", name: "Relizane", name_ar: "غليزان", home: 800, desk: 500 },
  { code: "49", name: "Timimoun", name_ar: "تيميمون", home: 1200, desk: 800 },
  { code: "50", name: "Bordj Badji Mokhtar", name_ar: "برج باجي مختار", home: 2000, desk: 1500 },
  { code: "51", name: "Ouled Djellal", name_ar: "أولاد جلال", home: 1100, desk: 700 },
  { code: "52", name: "Béni Abbès", name_ar: "بني عباس", home: 1200, desk: 800 },
  { code: "53", name: "In Salah", name_ar: "عين صالح", home: 1950, desk: 1400 },
  { code: "54", name: "In Guezzam", name_ar: "عين قزام", home: 1950, desk: 1400 },
  { code: "55", name: "Touggourt", name_ar: "تقرت", home: 1100, desk: 700 },
  { code: "56", name: "Djanet", name_ar: "جانت", home: 1950, desk: 1400 },
  { code: "57", name: "El M'Ghair", name_ar: "المغير", home: 1100, desk: 700 },
  { code: "58", name: "El Menia", name_ar: "المنيعة", home: 1100, desk: 700 }
];

async function init() {
  try {
    console.log('Connecting to database...');

    // 1. Create DeliveryCompanies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public."DeliveryCompanies" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Created DeliveryCompanies table.');

    // 2. Create DeliveryRates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public."DeliveryRates" (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES public."DeliveryCompanies"(id) ON DELETE CASCADE,
        city_name VARCHAR(255) NOT NULL,
        city_code VARCHAR(10) DEFAULT '',
        home_price NUMERIC(10, 2) NOT NULL DEFAULT 800,
        desk_price NUMERIC(10, 2) NOT NULL DEFAULT 500,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_company_city UNIQUE(company_id, city_name)
      );
    `);
    console.log('Created DeliveryRates table.');

    // 3. Grant permissions
    await pool.query(`
      GRANT ALL ON TABLE public."DeliveryCompanies" TO anon, authenticated, service_role;
      GRANT ALL ON TABLE public."DeliveryRates" TO anon, authenticated, service_role;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    `);
    console.log('Granted permissions to tables and sequences.');

    // 4. Check if default company exists; if not, create one
    const { rows: existingCompanies } = await pool.query('SELECT * FROM public."DeliveryCompanies"');
    if (existingCompanies.length === 0) {
      console.log('Inserting default delivery company (Yalidine Express)...');
      const insertCompanyRes = await pool.query(`
        INSERT INTO public."DeliveryCompanies" (name, code, is_active, is_default)
        VALUES ('Yalidine Express', 'yalidine', true, true)
        RETURNING id;
      `);
      const defaultCompanyId = insertCompanyRes.rows[0].id;

      console.log(`Populating 58 default wilayas for company id ${defaultCompanyId}...`);
      for (const w of DEFAULT_WILAYAS) {
        await pool.query(`
          INSERT INTO public."DeliveryRates" (company_id, city_name, city_code, home_price, desk_price, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (company_id, city_name) DO NOTHING;
        `, [defaultCompanyId, w.name, w.code, w.home, w.desk]);
      }
      console.log('Successfully inserted all 58 default wilayas!');
    } else {
      console.log(`Found ${existingCompanies.length} existing companies.`);
    }

    console.log('Database delivery setup completed successfully!');
  } catch (err) {
    console.error('Error during delivery setup:', err);
  } finally {
    await pool.end();
  }
}

init();
