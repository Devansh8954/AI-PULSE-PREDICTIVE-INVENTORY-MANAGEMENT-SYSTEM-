-- =============================================================
-- AI-Pulse | Seed Data — Development Environment
-- =============================================================

USE ai_pulse_db;

-- ---- Vendors ------------------------------------------------
INSERT INTO vendors (id, name, contact_email, contact_phone, total_deliveries, on_time_deliveries, avg_lead_days) VALUES
    ('11111111-1111-1111-1111-111111111111', 'TechSupply Co.',    'ops@techsupply.com',   '+91-9000000001', 120, 112, 4.50),
    ('22222222-2222-2222-2222-222222222222', 'GlobalParts Ltd.',  'supply@globalparts.io', '+91-9000000002', 80,  58,  7.20),
    ('33333333-3333-3333-3333-333333333333', 'FastStock Pvt.',    'hello@faststock.in',   '+91-9000000003', 200, 195, 2.10);

-- ---- Products -----------------------------------------------
INSERT INTO products (id, sku, name, description, category, brand, unit_price, unit_of_measure, version) VALUES
    ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-LPT-001', 'UltraBook Pro 15',      '15.6" i7 laptop',          'ELECTRONICS', 'TechBrand',  75999.0000, 'UNIT', 0),
    ('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-PHN-002', 'Quantum X12 Smartphone','6.7" AMOLED phone',        'ELECTRONICS', 'QuantumCo',  42999.0000, 'UNIT', 0),
    ('aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HOME-CHR-003', 'ErgoSit Office Chair',  'Lumbar support chair',     'HOME',        'ErgoDesign',  8999.0000, 'UNIT', 0),
    ('aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GROC-OIL-004', 'ColdPress Olive Oil 1L','Extra virgin olive oil',   'GROCERY',     'PureLeaf',     899.0000, 'LITRE', 0),
    ('aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ELEC-EAR-005', 'NoiseFree ANC Buds',   'Active noise-cancelling',  'ELECTRONICS', 'TechBrand',   5499.0000, 'UNIT', 0);

-- ---- Inventory ----------------------------------------------
INSERT INTO inventory (id, product_id, vendor_id, warehouse_location, quantity_on_hand, quantity_reserved, quantity_on_order, safety_stock_level, reorder_point, reorder_quantity) VALUES
    ('inv00001-0000-0000-0000-000000000001', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',   45,  5,  20, 10, 15, 50),
    ('inv00002-0000-0000-0000-000000000002', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',   12,  4,   0,  8, 10, 30),
    ('inv00003-0000-0000-0000-000000000003', 'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'WH-MUMBAI-01',  80,  0,   0, 15, 20, 40),
    ('inv00004-0000-0000-0000-000000000004', 'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'WH-MUMBAI-01', 500, 50, 200, 100,150,500),
    ('inv00005-0000-0000-0000-000000000005', 'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'WH-DELHI-01',    8,  2,   0,  5, 10, 25);

-- ---- Trend Signals ------------------------------------------
INSERT INTO trend_signals (id, product_id, signal_source, signal_type, signal_score, weight, raw_payload, signal_date) VALUES
    ('sig00001-0000-0000-0000-000000000001', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GOOGLE_TRENDS', 'DEMAND_SPIKE',        0.8750, 1.5000, '{"keyword":"Quantum X12 buy","index":87}', CURDATE()),
    ('sig00002-0000-0000-0000-000000000002', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TWITTER',       'SOCIAL_BUZZ',         0.7200, 1.2000, '{"mentions":14200,"sentiment":0.72}',     CURDATE()),
    ('sig00003-0000-0000-0000-000000000003', 'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEASONAL',      'SEASONAL_PEAK',       0.9000, 2.0000, '{"season":"Diwali","boost_factor":1.9}',  CURDATE()),
    ('sig00004-0000-0000-0000-000000000004', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MANUAL',        'COMPETITOR_STOCKOUT', 0.6500, 1.0000, '{"competitor":"RivalTech","sku":"RT-LP-X"}', CURDATE());
