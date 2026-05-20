-- =============================================================================
-- AI-Pulse | Seed Data — Development Environment
-- =============================================================================
-- Run AFTER schema.sql:
--   mysql -u root -p ai_pulse_db < database/schema.sql
--   mysql -u root -p ai_pulse_db < database/seed.sql
--
-- To re-seed cleanly (wipe & reload):
--   SET FOREIGN_KEY_CHECKS = 0;
--   TRUNCATE purchase_orders; TRUNCATE trend_signals;
--   TRUNCATE inventory; TRUNCATE products; TRUNCATE vendors; TRUNCATE users;
--   SET FOREIGN_KEY_CHECKS = 1;
--   SOURCE database/seed.sql;
-- =============================================================================

USE ai_pulse_db;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. VENDORS  (6 vendors across categories)
-- =============================================================================
INSERT INTO vendors (id, name, contact_email, contact_phone, address, total_deliveries, on_time_deliveries, avg_lead_days, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'TechSupply Co.',   'ops@techsupply.com',      '+91-9000000001', '42 Industrial Estate, Bengaluru, KA', 120, 112, 4.50, 1),
    ('22222222-2222-2222-2222-222222222222', 'GlobalParts Ltd.', 'supply@globalparts.io',   '+91-9000000002', '18 Export Zone, Chennai, TN',         80,  58,  7.20, 1),
    ('33333333-3333-3333-3333-333333333333', 'FastStock Pvt.',   'hello@faststock.in',      '+91-9000000003', '5 Warehouse Hub, Pune, MH',           200, 195, 2.10, 1),
    ('44444444-4444-4444-4444-444444444444', 'FabricWorld',      'orders@fabricworld.co.in','+91-9000000004', '88 Textile Park, Surat, GJ',          160, 138, 5.80, 1),
    ('55555555-5555-5555-5555-555555555555', 'BrewHouse Co.',    'supply@brewhouse.com',    '+91-9000000005', '12 Food Park, Hyderabad, TS',          95,  90,  3.20, 1),
    ('66666666-6666-6666-6666-666666666666', 'SportZone India',  'biz@sportzone.in',        '+91-9000000006', '77 Sports Complex, Noida, UP',         70,  52,  6.00, 1);


-- =============================================================================
-- 2. USERS  (1 admin + 2 managers + 2 viewers)
-- Passwords are bcrypt hashes of "Password@123"
-- Generated with: node -e "const b=require('bcryptjs');console.log(b.hashSync('Password@123',12))"
-- =============================================================================
-- NOTE: If you get an ENUM error when inserting the WAREHOUSE role, run first:
--   ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN','MANAGER','WAREHOUSE','VIEWER') NOT NULL DEFAULT 'VIEWER';
-- OR simply run: node src/scripts/fixAndSeedUsers.js (which does both steps automatically)

INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES
    ('usr00001-0000-0000-0000-000000000001', 'Admin User',   'admin@aipulse.com',     '$2a$12$SrL7VMwFa3/vZatODmuIkONR8Txd0POjiTUEMbxenG8oUYevqO9kC', 'ADMIN',     1),
    ('usr00002-0000-0000-0000-000000000002', 'Priya Sharma', 'manager1@aipulse.com',  '$2a$12$SrL7VMwFa3/vZatODmuIkONR8Txd0POjiTUEMbxenG8oUYevqO9kC', 'MANAGER',   1),
    ('usr00003-0000-0000-0000-000000000003', 'Rohan Mehta',  'manager2@aipulse.com',  '$2a$12$SrL7VMwFa3/vZatODmuIkONR8Txd0POjiTUEMbxenG8oUYevqO9kC', 'MANAGER',   1),
    ('usr00004-0000-0000-0000-000000000004', 'Ananya Singh', 'viewer1@aipulse.com',   '$2a$12$SrL7VMwFa3/vZatODmuIkONR8Txd0POjiTUEMbxenG8oUYevqO9kC', 'VIEWER',    1),
    ('usr00005-0000-0000-0000-000000000005', 'Dev Patel',    'warehouse@aipulse.com', '$2a$12$SrL7VMwFa3/vZatODmuIkONR8Txd0POjiTUEMbxenG8oUYevqO9kC', 'WAREHOUSE', 1);


-- =============================================================================
-- 3. PRODUCTS  (14 products across 5 categories)
-- =============================================================================
INSERT INTO products (id, sku, name, description, category, brand, unit_price, unit_of_measure, is_active, version) VALUES
    -- Electronics
    ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-LPT-001', 'UltraBook Pro 15',        '15.6" i7 laptop, 16GB RAM, 512GB SSD',          'ELECTRONICS', 'TechBrand',   75999.0000, 'UNIT',  1, 0),
    ('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-PHN-002', 'Quantum X12 Smartphone',  '6.7" AMOLED, 256GB, 5G enabled',                 'ELECTRONICS', 'QuantumCo',   42999.0000, 'UNIT',  1, 0),
    ('aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-EAR-003', 'NoiseFree ANC Buds',      'Active noise-cancelling wireless earbuds',       'ELECTRONICS', 'TechBrand',    5499.0000, 'UNIT',  1, 0),
    ('aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-CAM-004', 'ProShot 4K Action Cam',   'Waterproof 4K/60fps action camera',             'ELECTRONICS', 'ProShot',     12499.0000, 'UNIT',  1, 0),
    ('aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-TAB-005', 'FlexPad 11 Tablet',       '11" 2K display, 128GB, Android 14',             'ELECTRONICS', 'FlexTech',    24999.0000, 'UNIT',  1, 0),
    -- Apparel
    ('aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'APRL-JKT-006', 'Winter Jacket Pro',       'Insulated waterproof winter jacket, unisex',    'APPAREL',     'NorthStyle',   3499.0000, 'UNIT',  1, 0),
    ('aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'APRL-TSH-007', 'DryFit Training Tee',     'Moisture-wicking sports T-shirt',               'APPAREL',     'ActiveWear',    799.0000, 'UNIT',  1, 0),
    -- Sports
    ('aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SPRT-MAT-008', 'Yoga Mat Premium',        'Anti-slip 6mm PU yoga mat with carry strap',    'SPORTS',      'ZenFit',       1299.0000, 'UNIT',  1, 0),
    ('aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SPRT-HDT-009', 'Gaming Headset X3',       '7.1 surround sound, noise-cancelling mic',      'ELECTRONICS', 'GadgetPro',    4299.0000, 'UNIT',  1, 0),
    -- Home & Kitchen
    ('aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HOME-CHR-010', 'ErgoSit Office Chair',    'Lumbar support mesh chair, adjustable arms',    'HOME',        'ErgoDesign',   8999.0000, 'UNIT',  1, 0),
    ('aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HOME-BLD-011', 'PowerBlend Pro 1200W',    '1200W blender, 5 speeds, stainless blades',     'HOME',        'KitchenKing',  3299.0000, 'UNIT',  1, 0),
    -- Grocery & Food
    ('aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GROC-OIL-012', 'ColdPress Olive Oil 1L',  'Extra virgin cold-pressed olive oil',           'GROCERY',     'PureLeaf',      899.0000, 'LITRE', 1, 0),
    ('aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GROC-COF-013', 'Coffee Blend Dark 500g',  'Premium dark roast Arabica & Robusta blend',   'GROCERY',     'BrewMaster',    549.0000, 'UNIT',  1, 0),
    ('aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GROC-NUT-014', 'Mixed Nuts Premium 1kg',  'Cashews, almonds, walnuts, pistachios mix',    'GROCERY',     'NutriNuts',    1199.0000, 'KG',    1, 0);


-- =============================================================================
-- 4. INVENTORY  (multi-warehouse, varied stock levels — low stock for alerts)
-- Reorder point > quantity_on_hand = low-stock alert shown on Manager dashboard
-- =============================================================================
INSERT INTO inventory (id, product_id, vendor_id, warehouse_location, quantity_on_hand, quantity_reserved, quantity_on_order, safety_stock_level, reorder_point, reorder_quantity, last_restock_date, next_restock_eta) VALUES
    -- Electronics – WH-DELHI-01
    ('inv00001-0000-0000-0000-000000000001', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',  45,  5,  20,  10,  15,  50, '2024-12-01', '2024-12-20'),
    ('inv00002-0000-0000-0000-000000000002', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',  12,  4,   0,   8,  10,  30, '2024-11-20', NULL),         -- LOW STOCK
    ('inv00003-0000-0000-0000-000000000003', 'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',   8,  2,   0,   5,  10,  25, '2024-11-15', NULL),         -- LOW STOCK (critical)
    ('inv00004-0000-0000-0000-000000000004', 'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',  60,  0,   0,  15,  20,  40, '2024-12-05', NULL),
    ('inv00005-0000-0000-0000-000000000005', 'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',  35,  5,  10,  10,  15,  30, '2024-12-10', '2024-12-22'),
    -- Apparel – WH-DELHI-01
    ('inv00006-0000-0000-0000-000000000006', 'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'WH-DELHI-01',  12,  2,   0,  20,  50, 200, '2024-11-10', NULL),         -- LOW STOCK (critical – winter demand)
    ('inv00007-0000-0000-0000-000000000007', 'aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'WH-DELHI-01', 320, 40,   0,  50,  80, 300, '2024-12-01', NULL),
    -- Sports – WH-MUMBAI-01
    ('inv00008-0000-0000-0000-000000000008', 'aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'WH-MUMBAI-01', 35,  0,   0,  15,  40, 100, '2024-11-25', NULL),         -- LOW STOCK
    ('inv00009-0000-0000-0000-000000000009', 'aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',   5,  1,   0,   5,  30,  60, '2024-11-01', NULL),         -- LOW STOCK (critical)
    -- Home – WH-MUMBAI-01
    ('inv00010-0000-0000-0000-000000000010', 'aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'WH-MUMBAI-01', 80,  0,   0,  15,  20,  40, '2024-12-01', NULL),
    ('inv00011-0000-0000-0000-000000000011', 'aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'WH-MUMBAI-01', 55, 10,  20,  10,  15,  30, '2024-12-08', '2024-12-25'),
    -- Grocery – WH-MUMBAI-01
    ('inv00012-0000-0000-0000-000000000012', 'aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'WH-MUMBAI-01',500, 50, 200, 100, 150, 500, '2024-12-10', '2024-12-15'),
    ('inv00013-0000-0000-0000-000000000013', 'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'WH-MUMBAI-01', 44, 10,   0,  30,  80, 200, '2024-11-28', NULL),         -- LOW STOCK
    ('inv00014-0000-0000-0000-000000000014', 'aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'WH-MUMBAI-01',180, 20,  50,  50,  60, 150, '2024-12-05', '2024-12-18');


-- =============================================================================
-- 5. TREND SIGNALS  (10 signals for analyst dashboard charts)
-- =============================================================================
INSERT INTO trend_signals (id, product_id, signal_source, signal_type, signal_score, weight, raw_payload, signal_date) VALUES
    ('sig00001-0000-0000-0000-000000000001', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GOOGLE_TRENDS', 'DEMAND_SPIKE',        0.8750, 1.5000, '{"keyword":"Quantum X12 buy","index":87,"region":"IN"}',             CURDATE()),
    ('sig00002-0000-0000-0000-000000000002', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TWITTER',       'SOCIAL_BUZZ',         0.7200, 1.2000, '{"mentions":14200,"sentiment":0.72,"hashtag":"#QuantumX12"}',        CURDATE()),
    ('sig00003-0000-0000-0000-000000000003', 'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEASONAL',      'SEASONAL_PEAK',       0.9000, 2.0000, '{"season":"Diwali","boost_factor":1.9,"totalOnHand":8}',             CURDATE()),
    ('sig00004-0000-0000-0000-000000000004', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MANUAL',        'COMPETITOR_STOCKOUT', 0.6500, 1.0000, '{"competitor":"RivalTech","sku":"RT-LP-X","totalOnHand":45}',        CURDATE()),
    ('sig00005-0000-0000-0000-000000000005', 'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEASONAL',      'SEASONAL_PEAK',       0.9500, 2.5000, '{"season":"Winter","boost_factor":2.4,"totalOnHand":12}',            CURDATE()),
    ('sig00006-0000-0000-0000-000000000006', 'aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GOOGLE_TRENDS', 'DEMAND_SPIKE',        0.8200, 1.8000, '{"keyword":"Gaming Headset buy","index":82,"totalOnHand":5}',        CURDATE()),
    ('sig00007-0000-0000-0000-000000000007', 'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEASONAL',      'SEASONAL_PEAK',       0.7800, 1.5000, '{"season":"Winter","reason":"Coffee demand peaks in cold weather","totalOnHand":44}', CURDATE()),
    ('sig00008-0000-0000-0000-000000000008', 'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TWITTER',       'SOCIAL_BUZZ',         0.6300, 1.1000, '{"mentions":8900,"sentiment":0.63,"hashtag":"#FlexPad"}',           CURDATE()),
    ('sig00009-0000-0000-0000-000000000009', 'aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GOOGLE_TRENDS', 'DEMAND_SPIKE',        0.7100, 1.4000, '{"keyword":"yoga mat premium","index":71,"totalOnHand":35}',         CURDATE()),
    ('sig00010-0000-0000-0000-000000000010', 'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TWITTER',       'SOCIAL_BUZZ',         0.5500, 0.9000, '{"mentions":4200,"sentiment":0.55,"hashtag":"#ProShot4K"}',         CURDATE());


-- =============================================================================
-- 6. PURCHASE ORDERS  (8 POs across statuses — visible on Manager dashboard)
-- created_by references usr00002 (Priya Sharma, MANAGER)
-- =============================================================================
INSERT INTO purchase_orders (id, po_number, vendor_id, line_items, total_units, total_cost, status, notes, expected_delivery_date, created_by, created_at) VALUES
    (
        'po000001-0000-0000-0000-000000000001',
        'PO-2024-0001',
        '44444444-4444-4444-4444-444444444444',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',200,'unitCost',3200),
            JSON_OBJECT('productId','aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',300,'unitCost',720)
        ),
        500, 856000.00, 'APPROVED',
        'Urgent winter season replenishment — critical stock',
        '2024-12-20',
        'usr00002-0000-0000-0000-000000000002',
        NOW() - INTERVAL 2 HOUR
    ),
    (
        'po000002-0000-0000-0000-000000000002',
        'PO-2024-0002',
        '11111111-1111-1111-1111-111111111111',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',30,'unitCost',40000),
            JSON_OBJECT('productId','aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',60,'unitCost',5000),
            JSON_OBJECT('productId','aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',60,'unitCost',3900),
            JSON_OBJECT('productId','aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',15,'unitCost',72000),
            JSON_OBJECT('productId','aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',30,'unitCost',23500)
        ),
        195, 2910000.00, 'PENDING',
        'Monthly electronics top-up — await CFO approval',
        '2024-12-28',
        'usr00002-0000-0000-0000-000000000002',
        NOW() - INTERVAL 4 HOUR
    ),
    (
        'po000003-0000-0000-0000-000000000003',
        'PO-2024-0003',
        '66666666-6666-6666-6666-666666666666',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',100,'unitCost',1150),
            JSON_OBJECT('productId','aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',200,'unitCost',720)
        ),
        300, 259000.00, 'DISPATCHED',
        'Sports & apparel restock — in transit',
        '2024-12-16',
        'usr00003-0000-0000-0000-000000000003',
        NOW() - INTERVAL 1 DAY
    ),
    (
        'po000004-0000-0000-0000-000000000004',
        'PO-2024-0004',
        '55555555-5555-5555-5555-555555555555',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',200,'unitCost',499),
            JSON_OBJECT('productId','aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',600,'unitCost',820)
        ),
        800, 591800.00, 'PENDING',
        'Grocery winter demand forecast replenishment',
        '2025-01-03',
        'usr00002-0000-0000-0000-000000000002',
        NOW() - INTERVAL 1 DAY
    ),
    (
        'po000005-0000-0000-0000-000000000005',
        'PO-2024-0005',
        '11111111-1111-1111-1111-111111111111',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',40,'unitCost',11500)
        ),
        40, 460000.00, 'RECEIVED',
        'Action cam restock — received and shelved at WH-DELHI-01',
        '2024-12-10',
        'usr00003-0000-0000-0000-000000000003',
        NOW() - INTERVAL 5 DAY
    ),
    (
        'po000006-0000-0000-0000-000000000006',
        'PO-2024-0006',
        '22222222-2222-2222-2222-222222222222',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',40,'unitCost',8200),
            JSON_OBJECT('productId','aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',30,'unitCost',3000)
        ),
        70, 418000.00, 'APPROVED',
        'Home & kitchen restock for Q1',
        '2024-12-30',
        'usr00002-0000-0000-0000-000000000002',
        NOW() - INTERVAL 2 DAY
    ),
    (
        'po000007-0000-0000-0000-000000000007',
        'PO-2024-0007',
        '44444444-4444-4444-4444-444444444444',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',100,'unitCost',3200)
        ),
        100, 320000.00, 'CANCELLED',
        'Duplicate order — cancelled in favour of PO-2024-0001',
        NULL,
        'usr00003-0000-0000-0000-000000000003',
        NOW() - INTERVAL 3 DAY
    ),
    (
        'po000008-0000-0000-0000-000000000008',
        'PO-2024-0008',
        '55555555-5555-5555-5555-555555555555',
        JSON_ARRAY(
            JSON_OBJECT('productId','aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',150,'unitCost',1100),
            JSON_OBJECT('productId','aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa','quantity',200,'unitCost',499)
        ),
        350, 264800.00, 'DISPATCHED',
        'Nuts & coffee — seasonal demand surge',
        '2024-12-22',
        'usr00002-0000-0000-0000-000000000002',
        NOW() - INTERVAL 6 HOUR
    );

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFY SEED DATA
-- =============================================================================
SELECT 'vendors'        AS tbl, COUNT(*) AS rows FROM vendors
UNION ALL
SELECT 'users',         COUNT(*) FROM users
UNION ALL
SELECT 'products',      COUNT(*) FROM products
UNION ALL
SELECT 'inventory',     COUNT(*) FROM inventory
UNION ALL
SELECT 'trend_signals', COUNT(*) FROM trend_signals
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders;
