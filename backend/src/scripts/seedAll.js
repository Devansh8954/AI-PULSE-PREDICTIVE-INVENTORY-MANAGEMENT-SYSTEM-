'use strict';
/**
 * seedAll.js — Run: node src/scripts/seedAll.js
 * Inserts vendors, products, inventory, trend_signals, purchase_orders.
 * Uses upsert — safe to run multiple times.
 */
require('dotenv').config();
const { sequelize } = require('../config/db.config');
require('../models');
const Vendor        = require('../models/vendor.model');
const Product       = require('../models/product.model');
const Inventory     = require('../models/inventory.model');
const TrendSignal   = require('../models/trendSignal.model');
const PurchaseOrder = require('../models/purchaseOrder.model');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅  DB OK\n');

    // ── 1. VENDORS ───────────────────────────────────────────────────────────
    const vendors = [
      { id:'11111111-1111-1111-1111-111111111111', name:'TechSupply Co.',   contactEmail:'ops@techsupply.com',      contactPhone:'+91-9000000001', address:'42 Industrial Estate, Bengaluru', totalDeliveries:120, onTimeDeliveries:112, avgLeadDays:4.50, isActive:true },
      { id:'22222222-2222-2222-2222-222222222222', name:'GlobalParts Ltd.', contactEmail:'supply@globalparts.io',   contactPhone:'+91-9000000002', address:'18 Export Zone, Chennai',           totalDeliveries:80,  onTimeDeliveries:58,  avgLeadDays:7.20, isActive:true },
      { id:'33333333-3333-3333-3333-333333333333', name:'FastStock Pvt.',   contactEmail:'hello@faststock.in',      contactPhone:'+91-9000000003', address:'5 Warehouse Hub, Pune',             totalDeliveries:200, onTimeDeliveries:195, avgLeadDays:2.10, isActive:true },
      { id:'44444444-4444-4444-4444-444444444444', name:'FabricWorld',      contactEmail:'orders@fabricworld.co.in',contactPhone:'+91-9000000004', address:'88 Textile Park, Surat',            totalDeliveries:160, onTimeDeliveries:138, avgLeadDays:5.80, isActive:true },
      { id:'55555555-5555-5555-5555-555555555555', name:'BrewHouse Co.',    contactEmail:'supply@brewhouse.com',    contactPhone:'+91-9000000005', address:'12 Food Park, Hyderabad',           totalDeliveries:95,  onTimeDeliveries:90,  avgLeadDays:3.20, isActive:true },
      { id:'66666666-6666-6666-6666-666666666666', name:'SportZone India',  contactEmail:'biz@sportzone.in',        contactPhone:'+91-9000000006', address:'77 Sports Complex, Noida',          totalDeliveries:70,  onTimeDeliveries:52,  avgLeadDays:6.00, isActive:true },
    ];
    for (const v of vendors) { await Vendor.upsert(v); }
    console.log(`✅  Vendors     : ${vendors.length}`);

    // ── 2. PRODUCTS ──────────────────────────────────────────────────────────
    const products = [
      { id:'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'ELEC-LPT-001', name:'UltraBook Pro 15',       description:'15.6" i7 laptop',                category:'ELECTRONICS', brand:'TechBrand',   unitPrice:75999, unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'ELEC-PHN-002', name:'Quantum X12 Smartphone', description:'6.7" AMOLED 256GB 5G',            category:'ELECTRONICS', brand:'QuantumCo',   unitPrice:42999, unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'ELEC-EAR-003', name:'NoiseFree ANC Buds',     description:'ANC wireless earbuds',            category:'ELECTRONICS', brand:'TechBrand',   unitPrice:5499,  unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'ELEC-CAM-004', name:'ProShot 4K Action Cam',  description:'Waterproof 4K/60fps',             category:'ELECTRONICS', brand:'ProShot',     unitPrice:12499, unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'ELEC-TAB-005', name:'FlexPad 11 Tablet',      description:'11" 2K 128GB Android 14',         category:'ELECTRONICS', brand:'FlexTech',   unitPrice:24999, unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'APRL-JKT-006', name:'Winter Jacket Pro',      description:'Insulated waterproof jacket',     category:'APPAREL',     brand:'NorthStyle',  unitPrice:3499,  unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'APRL-TSH-007', name:'DryFit Training Tee',    description:'Moisture-wicking sports tee',     category:'APPAREL',     brand:'ActiveWear',  unitPrice:799,   unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'SPRT-MAT-008', name:'Yoga Mat Premium',       description:'Anti-slip 6mm PU mat',            category:'SPORTS',      brand:'ZenFit',      unitPrice:1299,  unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'SPRT-HDT-009', name:'Gaming Headset X3',      description:'7.1 surround noise-cancel mic',   category:'ELECTRONICS', brand:'GadgetPro',   unitPrice:4299,  unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'HOME-CHR-010', name:'ErgoSit Office Chair',   description:'Lumbar support mesh chair',       category:'HOME',        brand:'ErgoDesign',  unitPrice:8999,  unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'HOME-BLD-011', name:'PowerBlend Pro 1200W',   description:'1200W blender stainless blades',  category:'HOME',        brand:'KitchenKing', unitPrice:3299,  unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'GROC-OIL-012', name:'ColdPress Olive Oil 1L', description:'Extra virgin cold-pressed oil',   category:'GROCERY',     brand:'PureLeaf',    unitPrice:899,   unitOfMeasure:'LITRE',isActive:true, version:0 },
      { id:'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'GROC-COF-013', name:'Coffee Blend Dark 500g', description:'Dark roast Arabica Robusta blend', category:'GROCERY',    brand:'BrewMaster',  unitPrice:549,   unitOfMeasure:'UNIT', isActive:true, version:0 },
      { id:'aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa', sku:'GROC-NUT-014', name:'Mixed Nuts Premium 1kg', description:'Cashews almonds walnuts mix',     category:'GROCERY',     brand:'NutriNuts',   unitPrice:1199,  unitOfMeasure:'KG',   isActive:true, version:0 },
    ];
    for (const p of products) { await Product.upsert(p); }
    console.log(`✅  Products    : ${products.length}`);

    // ── 3. INVENTORY ─────────────────────────────────────────────────────────
    const inventory = [
      { id:'inv00001-0000-0000-0000-000000000001', productId:'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'11111111-1111-1111-1111-111111111111', warehouseLocation:'WH-DELHI-01',  quantityOnHand:45,  quantityReserved:5,  quantityOnOrder:20,  safetyStockLevel:10, reorderPoint:15,  reorderQuantity:50,  lastRestockDate:'2024-12-01', nextRestockEta:'2024-12-20', version:0 },
      { id:'inv00002-0000-0000-0000-000000000002', productId:'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'11111111-1111-1111-1111-111111111111', warehouseLocation:'WH-DELHI-01',  quantityOnHand:12,  quantityReserved:4,  quantityOnOrder:0,   safetyStockLevel:8,  reorderPoint:10,  reorderQuantity:30,  lastRestockDate:'2024-11-20', nextRestockEta:null, version:0 },
      { id:'inv00003-0000-0000-0000-000000000003', productId:'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'11111111-1111-1111-1111-111111111111', warehouseLocation:'WH-DELHI-01',  quantityOnHand:8,   quantityReserved:2,  quantityOnOrder:0,   safetyStockLevel:5,  reorderPoint:10,  reorderQuantity:25,  lastRestockDate:'2024-11-15', nextRestockEta:null, version:0 },
      { id:'inv00004-0000-0000-0000-000000000004', productId:'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'11111111-1111-1111-1111-111111111111', warehouseLocation:'WH-DELHI-01',  quantityOnHand:60,  quantityReserved:0,  quantityOnOrder:0,   safetyStockLevel:15, reorderPoint:20,  reorderQuantity:40,  lastRestockDate:'2024-12-05', nextRestockEta:null, version:0 },
      { id:'inv00005-0000-0000-0000-000000000005', productId:'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'11111111-1111-1111-1111-111111111111', warehouseLocation:'WH-DELHI-01',  quantityOnHand:35,  quantityReserved:5,  quantityOnOrder:10,  safetyStockLevel:10, reorderPoint:15,  reorderQuantity:30,  lastRestockDate:'2024-12-10', nextRestockEta:'2024-12-22', version:0 },
      { id:'inv00006-0000-0000-0000-000000000006', productId:'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'44444444-4444-4444-4444-444444444444', warehouseLocation:'WH-DELHI-01',  quantityOnHand:12,  quantityReserved:2,  quantityOnOrder:0,   safetyStockLevel:20, reorderPoint:50,  reorderQuantity:200, lastRestockDate:'2024-11-10', nextRestockEta:null, version:0 },
      { id:'inv00007-0000-0000-0000-000000000007', productId:'aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'44444444-4444-4444-4444-444444444444', warehouseLocation:'WH-DELHI-01',  quantityOnHand:320, quantityReserved:40, quantityOnOrder:0,   safetyStockLevel:50, reorderPoint:80,  reorderQuantity:300, lastRestockDate:'2024-12-01', nextRestockEta:null, version:0 },
      { id:'inv00008-0000-0000-0000-000000000008', productId:'aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'66666666-6666-6666-6666-666666666666', warehouseLocation:'WH-MUMBAI-01', quantityOnHand:35,  quantityReserved:0,  quantityOnOrder:0,   safetyStockLevel:15, reorderPoint:40,  reorderQuantity:100, lastRestockDate:'2024-11-25', nextRestockEta:null, version:0 },
      { id:'inv00009-0000-0000-0000-000000000009', productId:'aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'11111111-1111-1111-1111-111111111111', warehouseLocation:'WH-DELHI-01',  quantityOnHand:5,   quantityReserved:1,  quantityOnOrder:0,   safetyStockLevel:5,  reorderPoint:30,  reorderQuantity:60,  lastRestockDate:'2024-11-01', nextRestockEta:null, version:0 },
      { id:'inv00010-0000-0000-0000-000000000010', productId:'aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'22222222-2222-2222-2222-222222222222', warehouseLocation:'WH-MUMBAI-01', quantityOnHand:80,  quantityReserved:0,  quantityOnOrder:0,   safetyStockLevel:15, reorderPoint:20,  reorderQuantity:40,  lastRestockDate:'2024-12-01', nextRestockEta:null, version:0 },
      { id:'inv00011-0000-0000-0000-000000000011', productId:'aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'22222222-2222-2222-2222-222222222222', warehouseLocation:'WH-MUMBAI-01', quantityOnHand:55,  quantityReserved:10, quantityOnOrder:20,  safetyStockLevel:10, reorderPoint:15,  reorderQuantity:30,  lastRestockDate:'2024-12-08', nextRestockEta:'2024-12-25', version:0 },
      { id:'inv00012-0000-0000-0000-000000000012', productId:'aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'55555555-5555-5555-5555-555555555555', warehouseLocation:'WH-MUMBAI-01', quantityOnHand:500, quantityReserved:50, quantityOnOrder:200, safetyStockLevel:100,reorderPoint:150, reorderQuantity:500, lastRestockDate:'2024-12-10', nextRestockEta:'2024-12-15', version:0 },
      { id:'inv00013-0000-0000-0000-000000000013', productId:'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'55555555-5555-5555-5555-555555555555', warehouseLocation:'WH-MUMBAI-01', quantityOnHand:44,  quantityReserved:10, quantityOnOrder:0,   safetyStockLevel:30, reorderPoint:80,  reorderQuantity:200, lastRestockDate:'2024-11-28', nextRestockEta:null, version:0 },
      { id:'inv00014-0000-0000-0000-000000000014', productId:'aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa', vendorId:'55555555-5555-5555-5555-555555555555', warehouseLocation:'WH-MUMBAI-01', quantityOnHand:180, quantityReserved:20, quantityOnOrder:50,  safetyStockLevel:50, reorderPoint:60,  reorderQuantity:150, lastRestockDate:'2024-12-05', nextRestockEta:'2024-12-18', version:0 },
    ];
    for (const inv of inventory) { await Inventory.upsert(inv); }
    console.log(`✅  Inventory   : ${inventory.length}`);

    // ── 4. TREND SIGNALS ─────────────────────────────────────────────────────
    const signals = [
      { id:'sig00001-0000-0000-0000-000000000001', productId:'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'GOOGLE_TRENDS', signalType:'DEMAND_SPIKE',        signalScore:0.875, weight:1.5, rawPayload:{keyword:'Quantum X12 buy',index:87,region:'IN'},             signalDate:new Date() },
      { id:'sig00002-0000-0000-0000-000000000002', productId:'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'TWITTER',       signalType:'SOCIAL_BUZZ',         signalScore:0.720, weight:1.2, rawPayload:{mentions:14200,sentiment:0.72,hashtag:'#QuantumX12'},          signalDate:new Date() },
      { id:'sig00003-0000-0000-0000-000000000003', productId:'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'SEASONAL',      signalType:'SEASONAL_PEAK',       signalScore:0.900, weight:2.0, rawPayload:{season:'Diwali',boost_factor:1.9,totalOnHand:8},               signalDate:new Date() },
      { id:'sig00004-0000-0000-0000-000000000004', productId:'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'MANUAL',        signalType:'COMPETITOR_STOCKOUT', signalScore:0.650, weight:1.0, rawPayload:{competitor:'RivalTech',sku:'RT-LP-X',totalOnHand:45},           signalDate:new Date() },
      { id:'sig00005-0000-0000-0000-000000000005', productId:'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'SEASONAL',      signalType:'SEASONAL_PEAK',       signalScore:0.950, weight:2.5, rawPayload:{season:'Winter',boost_factor:2.4,totalOnHand:12},              signalDate:new Date() },
      { id:'sig00006-0000-0000-0000-000000000006', productId:'aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'GOOGLE_TRENDS', signalType:'DEMAND_SPIKE',        signalScore:0.820, weight:1.8, rawPayload:{keyword:'Gaming Headset buy',index:82,totalOnHand:5},           signalDate:new Date() },
      { id:'sig00007-0000-0000-0000-000000000007', productId:'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'SEASONAL',      signalType:'SEASONAL_PEAK',       signalScore:0.780, weight:1.5, rawPayload:{season:'Winter',reason:'Coffee demand peaks',totalOnHand:44},   signalDate:new Date() },
      { id:'sig00008-0000-0000-0000-000000000008', productId:'aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'TWITTER',       signalType:'SOCIAL_BUZZ',         signalScore:0.630, weight:1.1, rawPayload:{mentions:8900,sentiment:0.63,hashtag:'#FlexPad'},               signalDate:new Date() },
      { id:'sig00009-0000-0000-0000-000000000009', productId:'aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'GOOGLE_TRENDS', signalType:'DEMAND_SPIKE',        signalScore:0.710, weight:1.4, rawPayload:{keyword:'yoga mat premium',index:71,totalOnHand:35},            signalDate:new Date() },
      { id:'sig00010-0000-0000-0000-000000000010', productId:'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa', signalSource:'TWITTER',       signalType:'SOCIAL_BUZZ',         signalScore:0.550, weight:0.9, rawPayload:{mentions:4200,sentiment:0.55,hashtag:'#ProShot4K'},             signalDate:new Date() },
    ];
    for (const s of signals) { await TrendSignal.upsert(s); }
    console.log(`✅  Signals     : ${signals.length}`);

    // ── 5. PURCHASE ORDERS ───────────────────────────────────────────────────
    const pos = [
      { id:'po000001-0000-0000-0000-000000000001', poNumber:'PO-2024-0001', vendorId:'44444444-4444-4444-4444-444444444444', lineItems:[{productId:'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:200,unitCost:3200},{productId:'aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:300,unitCost:720}],  totalUnits:500, totalCost:856000,   status:'APPROVED',    notes:'Urgent winter season replenishment',            expectedDeliveryDate:'2024-12-20', createdBy:'usr00002-0000-0000-0000-000000000002' },
      { id:'po000002-0000-0000-0000-000000000002', poNumber:'PO-2024-0002', vendorId:'11111111-1111-1111-1111-111111111111', lineItems:[{productId:'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:30,unitCost:40000},{productId:'aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:60,unitCost:5000},{productId:'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:15,unitCost:72000}], totalUnits:195, totalCost:2910000,  status:'PENDING',     notes:'Monthly electronics top-up — await CFO approval', expectedDeliveryDate:'2024-12-28', createdBy:'usr00002-0000-0000-0000-000000000002' },
      { id:'po000003-0000-0000-0000-000000000003', poNumber:'PO-2024-0003', vendorId:'66666666-6666-6666-6666-666666666666', lineItems:[{productId:'aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:100,unitCost:1150},{productId:'aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:200,unitCost:720}],  totalUnits:300, totalCost:259000,   status:'DISPATCHED',  notes:'Sports & apparel restock — in transit',          expectedDeliveryDate:'2024-12-16', createdBy:'usr00003-0000-0000-0000-000000000003' },
      { id:'po000004-0000-0000-0000-000000000004', poNumber:'PO-2024-0004', vendorId:'55555555-5555-5555-5555-555555555555', lineItems:[{productId:'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:200,unitCost:499},{productId:'aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:600,unitCost:820}],    totalUnits:800, totalCost:591800,   status:'PENDING',     notes:'Grocery winter demand forecast replenishment',   expectedDeliveryDate:'2025-01-03', createdBy:'usr00002-0000-0000-0000-000000000002' },
      { id:'po000005-0000-0000-0000-000000000005', poNumber:'PO-2024-0005', vendorId:'11111111-1111-1111-1111-111111111111', lineItems:[{productId:'aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:40,unitCost:11500}],                                                                               totalUnits:40,  totalCost:460000,   status:'RECEIVED',    notes:'Action cam restock — received at WH-DELHI-01',  expectedDeliveryDate:'2024-12-10', createdBy:'usr00003-0000-0000-0000-000000000003' },
      { id:'po000006-0000-0000-0000-000000000006', poNumber:'PO-2024-0006', vendorId:'22222222-2222-2222-2222-222222222222', lineItems:[{productId:'aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:40,unitCost:8200},{productId:'aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:30,unitCost:3000}],   totalUnits:70,  totalCost:418000,   status:'APPROVED',    notes:'Home & kitchen restock for Q1',                 expectedDeliveryDate:'2024-12-30', createdBy:'usr00002-0000-0000-0000-000000000002' },
      { id:'po000007-0000-0000-0000-000000000007', poNumber:'PO-2024-0007', vendorId:'44444444-4444-4444-4444-444444444444', lineItems:[{productId:'aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:100,unitCost:3200}],                                                                               totalUnits:100, totalCost:320000,   status:'CANCELLED',   notes:'Duplicate order — cancelled in favour of PO-0001', expectedDeliveryDate:null,         createdBy:'usr00003-0000-0000-0000-000000000003' },
      { id:'po000008-0000-0000-0000-000000000008', poNumber:'PO-2024-0008', vendorId:'55555555-5555-5555-5555-555555555555', lineItems:[{productId:'aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:150,unitCost:1100},{productId:'aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa',quantity:200,unitCost:499}],  totalUnits:350, totalCost:264800,   status:'DISPATCHED',  notes:'Nuts & coffee — seasonal demand surge',          expectedDeliveryDate:'2024-12-22', createdBy:'usr00002-0000-0000-0000-000000000002' },
    ];
    for (const po of pos) { await PurchaseOrder.upsert(po); }
    console.log(`✅  PurchaseOrders: ${pos.length}`);

    console.log('\n🎉  All seed data inserted! Dashboards are ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
