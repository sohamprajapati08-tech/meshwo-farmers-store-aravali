const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dwarkesh_store.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_slug TEXT NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER NOT NULL,
    rating REAL DEFAULT 4.9,
    reviews_count INTEGER DEFAULT 120,
    image_url TEXT NOT NULL,
    short_desc TEXT,
    description TEXT,
    benefits TEXT,
    ingredients TEXT,
    process_method TEXT,
    variants_json TEXT, -- JSON array of {label, price, original_price}
    dietary_tags TEXT,  -- comma separated
    badge TEXT,
    stock INTEGER DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_slug) REFERENCES categories(slug)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    discount INTEGER DEFAULT 0,
    shipping_fee INTEGER DEFAULT 0,
    total INTEGER NOT NULL,
    coupon_code TEXT,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'Pending',
    transaction_id TEXT,
    order_status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lab_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    tested_date TEXT NOT NULL,
    parameters TEXT NOT NULL,
    result_status TEXT DEFAULT 'PASS (100% Pure)',
    lab_name TEXT DEFAULT 'NABL Accredited Food Safety Laboratory',
    pdf_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'website_footer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'New',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations for orders table
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'Pending'"); } catch(e){}
try { db.exec("ALTER TABLE orders ADD COLUMN transaction_id TEXT"); } catch(e){}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_session_id TEXT"); } catch(e){}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_url TEXT"); } catch(e){}

// Seed Admin User (admin001 / admin@001)
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get().count;
if (adminCount === 0) {
  db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run('admin001', 'admin@001');
}

// Seed Initial Lab Reports
const labReportCount = db.prepare('SELECT COUNT(*) as count FROM lab_reports').get().count;
if (labReportCount === 0) {
  const insertReport = db.prepare(`
    INSERT INTO lab_reports (title, batch_number, tested_date, parameters, result_status, lab_name, pdf_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReport.run(
    'Raw Wild Forest Honey (Polo Forest)',
    'MF-HNY-2026',
    'September 2026',
    'NMR Tested, 0% Added Sugars, 100% Forest Multiflora Pollen',
    'PASS (100% Raw Forest Harvest)',
    'NABL Food Purity Lab #941',
    '/api/lab-reports/download/MF-HNY-2026'
  );

  insertReport.run(
    'Aravalli Pure Turmeric Powder (5% Curcumin)',
    'MF-TURM-502',
    'September 2026',
    'Active Curcumin 5.12%, Lead Chromate Zero, Pesticide Free',
    'PASS (High Potency Ayurvedic)',
    'NABL Analytical Labs #318',
    '/api/lab-reports/download/MF-TURM-502'
  );

  insertReport.run(
    'Organic Moringa Leaf Powder',
    'MF-MOR-114',
    'August 2026',
    'Heavy Metals Non-Detectable, Micro-organism Tested, Low Temp Dehydrated',
    'PASS (Nutrient Dense)',
    'Intertek Global Safety Facility',
    '/api/lab-reports/download/MF-MOR-114'
  );
}

// Seed Store Settings & Branding for MESHWO FARMERS
const initialSettings = {
  shop_name: 'MESHWO FARMERS',
  company_name: 'MESHWO FARMER PRODUCER CO. LTD',
  tagline: 'INITIATIVE BY TRIBAL WOMEN FARMERS ARAVALLI',
  announcement_ticker: '🌿 MESHWO FARMERS: Pure Forest & Tribal Harvest by Women Farmers of Aravalli & Polo Forest | Free Delivery on Orders Above ₹999 | Call: 6356785785 / 9033785785',
  standard_shipping_fee: '0',
  free_shipping_threshold: '999',
  phone: '6356785785 / 9033785785',
  email: 'meshwofpc24@gmail.com',
  address: 'Shop no 1: Ranchodji temple Nr. sbi bank shamlaji, Ta - Shamlaji, Dist - Aravalli Gujarat.',
  social_handle: '@meshwofarmers',
  // Hero Poster Section Settings
  hero_poster_url: '/images/meshwo_warli_banner.jpg',
  hero_poster_badge: 'INITIATIVE BY TRIBAL WOMEN FARMERS ARAVALLI',
  hero_poster_title: 'Pure Wild Honey, Mahuva Superfoods & Forest Herbal Care',
  hero_poster_subtitle: 'Empowering indigenous tribal women farmers of Shamlaji, Polo Forest & Aravalli hills. Hand-harvested, chemical-free forest produce delivered directly from nature to your family.',
  hero_poster_button_text: 'Explore Tribal Forest Harvest',
  hero_poster_link: '#productsSection',
  // Payment Gateway Configurations
  payment_upi_id: 'sohamprajapati08@okicici',
  payment_upi_qr: '/uploads/upi_qr.jpeg',
  payment_upi_active: 'true',
  bank_account_holder: 'Meshwo Farmers Producer Co.',
  bank_name: 'State Bank of India (SBI)',
  bank_account_number: '39845019284',
  bank_ifsc: 'SBIN0001234',
  bank_account_type: 'Current / Business Account',
  business_merchant_name: 'Meshwo Farmers Store Aravalli',
  payment_razorpay_key: 'rzp_test_DwarkeshFarms2026',
  payment_razorpay_key_id: 'rzp_test_DwarkeshFarms2026',
  payment_razorpay_key_secret: '',
  payment_razorpay_active: 'true',
  payment_paypal_email: 'meshwofpc24@gmail.com',
  payment_paypal_active: 'true',
  payment_cod_active: 'true',
  google_sheets_webhook_url: ''
};

const insertSettingIfMissing = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

for (const [key, val] of Object.entries(initialSettings)) {
  insertSettingIfMissing.run(key, val);
}

// Seed Categories
const initialCategories = [
  { name: 'Forest Wild Honey & Sweeteners', slug: 'wild-honey', tagline: 'Single origin raw honey collected from Polo and Aravalli forests', icon: '🍯' },
  { name: 'Tribal Energy Foods & Sweets', slug: 'tribal-foods', tagline: 'Traditional Mahuva superfoods made with jaggery, peanuts & no sugar', icon: '🟤' },
  { name: 'Traditional Forest Oils', slug: 'forest-oils', tagline: 'Multi-use Mahuva oil for soothing pain relief, hair and wellness', icon: '🫒' },
  { name: 'Handcrafted Herbal Soaps', slug: 'herbal-soaps', tagline: 'Gentle soaps made with vibrant Kesuda flowers and fresh neem', icon: '🧼' },
  { name: 'Forest Hair Care & Shampoos', slug: 'hair-care', tagline: 'Botanical infusions of Amla, Shikakai, Reetha & fresh Aloe Vera', icon: '🌿' },
  { name: 'Pure Hill Spices & Medicinal Herbs', slug: 'spices-herbs', tagline: 'Moringa, 5% high curcumin Turmeric & aromatic Desi Ginger powder', icon: '🌱' }
];

const insertCategory = db.prepare(`
  INSERT INTO categories (name, slug, tagline, icon)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET
    name = excluded.name,
    tagline = excluded.tagline,
    icon = excluded.icon
`);

for (const cat of initialCategories) {
  insertCategory.run(cat.name, cat.slug, cat.tagline, cat.icon);
}

// 10 AUTHENTIC PRODUCTS FROM MESHWO FARMERS
const meshwoProducts = [
  {
    title: 'Pure Wild Forest Honey (Aravalli & Polo Forest)',
    slug: 'pure-wild-forest-honey',
    category_slug: 'wild-honey',
    price: 150,
    original_price: 180,
    rating: 4.96,
    reviews_count: 312,
    image_url: '/uploads/dwk_wild_hany_1789838200790_80779.jpeg',
    short_desc: 'Collected by indigenous tribal women from wild beehives in the pristine forests near Polo and Aravalli hills.',
    description: 'Our wild honey is collected by tribal people from the natural forest near Polo and Aravalli hills which is 100% pure, raw, and unpasteurized. Unlike commercial honey, it is never micro-filtered or heat-processed, retaining live digestive enzymes, floral pollen, and natural forest minerals.',
    benefits: 'Boosts natural immunity, soothes coughs and sore throat, rich in wild medicinal floral antioxidants, natural energy source for whole family.',
    ingredients: '100% Raw Unfiltered Wild Forest Honey from Polo and Aravalli Hills.',
    process_method: 'Traditional Tribal Wild Harvesting (Cold extracted, cloth filtered)',
    variants_json: JSON.stringify([
      { label: '150 GM', price: 150, original_price: 180 },
      { label: '300 GM (Twin Pack)', price: 290, original_price: 350 },
      { label: '500 GM Eco Jar', price: 450, original_price: 540 }
    ]),
    dietary_tags: 'Wild Harvest,Polo Forest,Raw Honey,Unpasteurized,No Sugar Added',
    badge: 'WILD FOREST HARVEST',
    stock: 90
  },
  {
    title: 'Traditional Mahuva Laddu (Tribal Energy Food)',
    slug: 'traditional-mahuva-laddu',
    category_slug: 'tribal-foods',
    price: 100,
    original_price: 130,
    rating: 4.94,
    reviews_count: 245,
    image_url: '/uploads/dwk_mahuaa_chiki_laduu_1789838250626_96073.jpeg',
    short_desc: 'Traditional super energy food made from nutritious Mahuva flowers, mineral-rich jaggery and roasted peanuts.',
    description: 'Mahua laddu is made from mahuva fruits and flowers which is rich in calcium and magnesium, blended with pure desi jaggery and crunchy roasted peanuts with zero white sugar. In our tribal culture, Mahua laddu is celebrated as our sacred tribal super energy food.',
    benefits: 'High in natural calcium and magnesium, strengthens bones and muscles, provides sustained stamina, completely free of refined white sugar.',
    ingredients: 'Wild Mahuva Fruit & Flower Pulp, Desi Organic Jaggery, Roasted Peanuts, Cardamom.',
    process_method: 'Handmade Small Batches by Tribal Women Farmers of Aravalli',
    variants_json: JSON.stringify([
      { label: '200 GM', price: 100, original_price: 130 },
      { label: '400 GM (Pack of 2)', price: 190, original_price: 250 },
      { label: '1 KG Family Box', price: 450, original_price: 590 }
    ]),
    dietary_tags: 'Zero Sugar,High Calcium,Rich in Magnesium,Tribal Superfood,Natural Energy',
    badge: 'TRIBAL SUPERFOOD',
    stock: 120
  },
  {
    title: 'Pure Mahuva Multi-Use Oil (Pain Relief, Hair & Food)',
    slug: 'pure-mahuva-oil',
    category_slug: 'forest-oils',
    price: 100,
    original_price: 130,
    rating: 4.91,
    reviews_count: 188,
    image_url: '/uploads/dwk_mahua_oil_1789838320708_1555.jpeg',
    short_desc: 'Ancient multipurpose tribal oil extracted from wild Mahua seeds for soothing joint pain, deep hair nourishment and wellness.',
    description: 'Mahuva oil is multi-use for pain relief. You can use it as hair oil as well as healthy cooking food oil. It nourishes your whole body inside and outside both. Sourced from wild Mahua seed kernels and cold-pressed traditionally by our tribal cooperative.',
    benefits: 'Relieves joint, knee and muscular body ache, nourishes dry scalp and strengthens hair roots, therapeutic emollient for body massage.',
    ingredients: '100% Pure Cold-Pressed Wild Mahua (Madhuca Longifolia) Seed Oil.',
    process_method: 'Traditional Cold Wood-Pressed Extraction (Unrefined & Chemical-Free)',
    variants_json: JSON.stringify([
      { label: '100 ML', price: 100, original_price: 130 },
      { label: '250 ML', price: 230, original_price: 290 },
      { label: '500 ML', price: 440, original_price: 550 }
    ]),
    dietary_tags: 'Multi-Use,Pain Relief,Hair Nourishment,Cold Pressed,Wild Harvest',
    badge: 'MULTI-USE REMEDY',
    stock: 75
  },
  {
    title: 'Handcrafted Herbal Kesuda Soap (Flame of the Forest)',
    slug: 'herbal-kesuda-soap',
    category_slug: 'herbal-soaps',
    price: 50,
    original_price: 65,
    rating: 4.95,
    reviews_count: 270,
    image_url: '/uploads/dwk_kesuda_harbul_sabu_1789838432656_27615.jpeg',
    short_desc: 'Skin-brightening handmade botanical soap infused with vibrant Kesuda (Palash) forest flower petals.',
    description: 'Brighten your skin with the floral magic of Kesuda Soap, made from the vibrant Flame of the Forest flower. This gentle, herbal soap deeply cleanses while leaving your skin soft, radiant, and refreshed. Free of harsh synthetic sulfates and parabens.',
    benefits: 'Enhances skin radiance and complexion, soothes summer rashes and prickly heat, leaves skin velvety smooth with subtle natural floral aroma.',
    ingredients: 'Fresh Kesuda (Palash / Butea Monosperma) Flower Extract, Coconut Oil, Pure Glycerin, Forest Essential Oils.',
    process_method: 'Cold Process Artisan Soap Making by Aravalli Tribal Women',
    variants_json: JSON.stringify([
      { label: '100 GM', price: 50, original_price: 65 },
      { label: 'Pack of 3 (300 GM)', price: 140, original_price: 180 },
      { label: 'Pack of 5 (500 GM)', price: 220, original_price: 290 }
    ]),
    dietary_tags: '100% Herbal,Flame of Forest,Skin Brightening,Sulfate Free,Artisanal',
    badge: 'FLAME OF FOREST',
    stock: 150
  },
  {
    title: 'Pure Neem Herbal Soap (Antibacterial & Antifungal)',
    slug: 'pure-neem-herbal-soap',
    category_slug: 'herbal-soaps',
    price: 50,
    original_price: 65,
    rating: 4.92,
    reviews_count: 230,
    image_url: '/uploads/dwk_neem_harbal_sabu_1789838393424_91472.jpeg',
    short_desc: 'Therapeutic clarifying soap made with farm-fresh organic neem leaves and pure plant oils for clear skin.',
    description: 'Neem soap provides powerful antibacterial and antifungal properties that help clear acne, soothe irritated skin, and maintain natural skin moisture. Sourced from indigenous neem groves of Shamlaji, it deeply purifies pores without drying out sensitive skin.',
    benefits: 'Combats acne and breakouts, purifies fungal and skin irritations, balances excess sebum, maintains healthy skin barrier.',
    ingredients: 'Fresh Organic Neem Leaf Extract, Cold-Pressed Neem Oil, Pure Coconut Oil base, Herbal Hydrosols.',
    process_method: 'Slow Cold-Cured Artisan Soap Crafting',
    variants_json: JSON.stringify([
      { label: '100 GM', price: 50, original_price: 65 },
      { label: 'Pack of 3 (300 GM)', price: 140, original_price: 180 },
      { label: 'Pack of 5 (500 GM)', price: 220, original_price: 290 }
    ]),
    dietary_tags: 'Antibacterial,Antifungal,Acne Relief,100% Organic Neem,Handmade',
    badge: 'ANTIBACTERIAL',
    stock: 140
  },
  {
    title: 'Herbal Amla, Reetha & Shikakai Shampoo',
    slug: 'amla-reetha-shikakai-shampoo',
    category_slug: 'hair-care',
    price: 100,
    original_price: 130,
    rating: 4.93,
    reviews_count: 195,
    image_url: '/uploads/dwk_aritha_sikakai_1789838458745_5578.jpeg',
    short_desc: 'Traditional Ayurvedic hair stimulant made with wild Amla, Shikakai and natural soapnut Reetha.',
    description: 'Herbals Amla and Shikakai with Reetha Shampoo work as a stimulant, enhancing the growth and texture of the hair. The shampoo includes all the essential constituents that are majorly considered beneficial for hair growth, strengthening strands from follicles to tips.',
    benefits: 'Stimulates natural hair regrowth, cleanses with gentle soapnut lather, reduces premature graying, adds lustrous shine and volume.',
    ingredients: 'Wild Amla (Indian Gooseberry), Shikakai Pods, Soapnut (Reetha), Bhringraj, Fenugreek seed decoction, Purified Aqua.',
    process_method: 'Traditional Slow Ayurvedic Kwath Decoction Infusion',
    variants_json: JSON.stringify([
      { label: '100 ML', price: 100, original_price: 130 },
      { label: '200 ML', price: 190, original_price: 240 },
      { label: '500 ML Family Bottle', price: 440, original_price: 550 }
    ]),
    dietary_tags: 'Hair Growth Stimulant,Sulfate Free,Ayurvedic Formula,Natural Cleanser',
    badge: 'HAIR STIMULANT',
    stock: 110
  },
  {
    title: 'Pure Aloe Vera Herbal Shampoo (Deep Hydration)',
    slug: 'aloe-vera-herbal-shampoo',
    category_slug: 'hair-care',
    price: 100,
    original_price: 130,
    rating: 4.90,
    reviews_count: 168,
    image_url: '/uploads/dwk_alovera_sempu_1789838498078_67000.jpeg',
    short_desc: 'Hydrating natural shampoo infused with fresh aloe vera gel from Aravalli hills for anti-hairfall care.',
    description: 'Aloe vera herbal shampoo provides deep scalp hydration and helps reduce hair fall. The soothing cooling enzymes of farm-grown aloe vera moisturize dry, brittle strands, alleviate scalp itchiness, and nourish roots.',
    benefits: 'Deeply hydrates dry and irritated scalps, controls hair breakage and seasonal shedding, leaves hair silky, smooth and bouncy.',
    ingredients: 'Fresh Aravalli Aloe Vera Gel (98% Purity), Hibiscus Flower Extract, Coconut Derived Cleanser, Vitamin E.',
    process_method: 'Fresh Cold Gel Extraction & Herbal Compounding',
    variants_json: JSON.stringify([
      { label: '100 ML', price: 100, original_price: 130 },
      { label: '200 ML', price: 190, original_price: 240 },
      { label: '500 ML Family Bottle', price: 440, original_price: 550 }
    ]),
    dietary_tags: 'Deep Scalp Hydration,Hair Fall Control,Fresh Aloe Gel,Chemical Free',
    badge: 'DEEP HYDRATION',
    stock: 115
  },
  {
    title: 'Organic Moringa Leaf Powder (Medicinal Superfood)',
    slug: 'organic-moringa-leaf-powder',
    category_slug: 'spices-herbs',
    price: 100,
    original_price: 130,
    rating: 4.95,
    reviews_count: 220,
    image_url: '/images/products/moringa_leaf_powder.jpg',
    short_desc: 'Miracle tree drumstick leaf powder packed with 90+ nutrients, antioxidants and plant proteins.',
    description: 'Moringa powder is used as a medicine in multiple ways. It can help prevent and treat chronic diseases like inflammatory diseases, diabetes, and supports cellular health and immunity. Freshly harvested from pesticide-free Moringa trees across Aravalli hills and shade-dried.',
    benefits: 'Supports healthy blood sugar balance, powerful anti-inflammatory action, boosts hemoglobin and stamina, 7x more Vitamin C than oranges.',
    ingredients: '100% Pure Shade-Dried Organic Moringa Oleifera Leaves.',
    process_method: 'Hygienic Low-Temperature Shade Drying & Fine Mesh Milling',
    variants_json: JSON.stringify([
      { label: '100 GM', price: 100, original_price: 130 },
      { label: '250 GM', price: 230, original_price: 290 },
      { label: '500 GM', price: 430, original_price: 540 }
    ]),
    dietary_tags: 'Medicinal Superfood,Diabetes Friendly,Anti-Inflammatory,90+ Nutrients',
    badge: 'AYURVEDIC SUPERFOOD',
    stock: 130
  },
  {
    title: 'Pure Aravalli Turmeric Powder (5% High Curcumin)',
    slug: 'aravalli-turmeric-powder-curcumin',
    category_slug: 'spices-herbs',
    price: 160,
    original_price: 190,
    rating: 4.98,
    reviews_count: 380,
    image_url: '/images/products/aravalli_turmeric_powder.jpg',
    short_desc: 'Vibrant golden turmeric with 5% naturally occurring active curcumin grown in mineral-rich Aravalli soil.',
    description: 'Its bold, slightly peppery taste enhances curries, soups, and stir-fries while also adding a touch of warmth to golden milk and herbal teas with 5% natural curcumin. Cultivated organically without synthetic chemical fertilizers or artificial polishing agents.',
    benefits: 'High 5% active curcumin for potent joint and cellular anti-inflammatory healing, enhances digestion, promotes radiant skin glow.',
    ingredients: '100% Pure Indigenous Aravalli Turmeric Rhizomes (High Curcumin 5%).',
    process_method: 'Sun-Dried & Traditional Stone Chakki Grounding (Zero Polishing / No Added Colors)',
    variants_json: JSON.stringify([
      { label: '250 GM', price: 160, original_price: 190 },
      { label: '500 GM', price: 300, original_price: 360 },
      { label: '1 KG (Pack of 2)', price: 580, original_price: 700 }
    ]),
    dietary_tags: '5% Curcumin,High Potency,Zero Polishing,Golden Milk,Aravalli Grown',
    badge: '5% CURCUMIN',
    stock: 100
  },
  {
    title: 'Desi Ginger Powder (Delhi Ginger Powder Aravalli)',
    slug: 'desi-ginger-powder-aravalli',
    category_slug: 'spices-herbs',
    price: 195,
    original_price: 235,
    rating: 4.92,
    reviews_count: 175,
    image_url: '/images/products/desi_ginger_powder.jpg',
    short_desc: 'Made from premium ginger rhizomes, carefully cleaned, dried, and ground with spicy pungent flavor and warm earthy aroma.',
    description: 'Made from high-quality ginger rhizomes, carefully cleaned, dried, and ground into a fine powder · Spicy, pungent flavor with a warm, earthy aroma, grown and harvested in Aravalli district. Perfect for masala chai, soothing digestion, and traditional home remedies.',
    benefits: 'Aids optimal gastric digestion and relieves bloating, relieves throat discomfort and winter chills, pungent natural spice for gourmet cooking.',
    ingredients: '100% Pure Indigenous Dried Ginger Rhizomes (Sonth).',
    process_method: 'Traditional Sun-Cured & Stone Grounded (Zero Bleaching)',
    variants_json: JSON.stringify([
      { label: '250 GM', price: 195, original_price: 235 },
      { label: '500 GM', price: 370, original_price: 440 },
      { label: '1 KG (Pack of 2)', price: 710, original_price: 860 }
    ]),
    dietary_tags: 'Aravalli District,Digestive Health,Masala Chai,Pure Sonth,Unbleached',
    badge: 'ARAVALLI GROWN',
    stock: 95
  }
];

const insertProduct = db.prepare(`
  INSERT INTO products (
    title, slug, category_slug, price, original_price, rating, reviews_count,
    image_url, short_desc, description, benefits, ingredients, process_method,
    variants_json, dietary_tags, badge, stock
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    category_slug = excluded.category_slug,
    price = excluded.price,
    original_price = excluded.original_price,
    rating = excluded.rating,
    reviews_count = excluded.reviews_count,
    image_url = excluded.image_url,
    short_desc = excluded.short_desc,
    description = excluded.description,
    benefits = excluded.benefits,
    ingredients = excluded.ingredients,
    process_method = excluded.process_method,
    variants_json = excluded.variants_json,
    dietary_tags = excluded.dietary_tags,
    badge = excluded.badge,
    stock = excluded.stock,
    is_active = 1
`);

for (const prod of meshwoProducts) {
  insertProduct.run(
    prod.title,
    prod.slug,
    prod.category_slug,
    prod.price,
    prod.original_price,
    prod.rating,
    prod.reviews_count,
    prod.image_url,
    prod.short_desc,
    prod.description,
    prod.benefits,
    prod.ingredients,
    prod.process_method,
    prod.variants_json,
    prod.dietary_tags,
    prod.badge,
    prod.stock
  );
}

module.exports = db;
