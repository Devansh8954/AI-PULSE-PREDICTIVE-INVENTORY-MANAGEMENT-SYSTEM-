-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: ai_pulse_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendor_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Primary vendor for replenishment',
  `warehouse_location` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT' COMMENT 'Warehouse code or bin location',
  `quantity_on_hand` int NOT NULL DEFAULT '0' COMMENT 'Current physical stock count',
  `quantity_reserved` int NOT NULL DEFAULT '0' COMMENT 'Stock committed to open orders (soft lock)',
  `quantity_on_order` int NOT NULL DEFAULT '0' COMMENT 'Quantity in transit from vendor',
  `safety_stock_level` int NOT NULL DEFAULT '0' COMMENT 'Minimum buffer before alert is raised',
  `reorder_point` int NOT NULL DEFAULT '0' COMMENT 'Level at which PO should be triggered',
  `reorder_quantity` int NOT NULL DEFAULT '0' COMMENT 'Standard order batch size (EOQ)',
  `last_restock_date` date DEFAULT NULL,
  `next_restock_eta` date DEFAULT NULL,
  `version` bigint unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic locking version — incremented on every stock update',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_product_location` (`product_id`,`warehouse_location`),
  KEY `idx_inventory_vendor` (`vendor_id`),
  KEY `idx_inventory_low_stock` (`quantity_on_hand`,`reorder_point`),
  KEY `idx_inventory_version` (`version`),
  KEY `inventory_vendor_id` (`vendor_id`),
  KEY `inventory_quantity_on_hand_reorder_point` (`quantity_on_hand`,`reorder_point`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_qty_on_hand` CHECK ((`quantity_on_hand` >= 0)),
  CONSTRAINT `chk_qty_on_order` CHECK ((`quantity_on_order` >= 0)),
  CONSTRAINT `chk_qty_reserved` CHECK ((`quantity_reserved` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Real-time inventory state per product per warehouse. version enforces OCC.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES ('inv00001-0000-0000-0000-000000000001','aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','WH-DELHI-01',45,5,20,10,15,50,'2024-12-01','2024-12-20',0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00002-0000-0000-0000-000000000002','aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','WH-DELHI-01',12,4,0,8,10,30,'2024-11-20',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00003-0000-0000-0000-000000000003','aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','WH-DELHI-01',8,2,0,5,10,25,'2024-11-15',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00004-0000-0000-0000-000000000004','aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','WH-DELHI-01',60,0,0,15,20,40,'2024-12-05',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00005-0000-0000-0000-000000000005','aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','WH-DELHI-01',35,5,10,10,15,30,'2024-12-10','2024-12-22',0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00006-0000-0000-0000-000000000006','aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','WH-DELHI-01',12,2,0,20,50,200,'2024-11-10',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00007-0000-0000-0000-000000000007','aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','WH-DELHI-01',320,40,0,50,80,300,'2024-12-01',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00008-0000-0000-0000-000000000008','aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa','66666666-6666-6666-6666-666666666666','WH-MUMBAI-01',35,0,0,15,40,100,'2024-11-25',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00009-0000-0000-0000-000000000009','aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','WH-DELHI-01',5,1,0,5,30,60,'2024-11-01',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00010-0000-0000-0000-000000000010','aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','WH-MUMBAI-01',80,0,0,15,20,40,'2024-12-01',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00011-0000-0000-0000-000000000011','aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','WH-MUMBAI-01',55,10,20,10,15,30,'2024-12-08','2024-12-25',0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00012-0000-0000-0000-000000000012','aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa','55555555-5555-5555-5555-555555555555','WH-MUMBAI-01',500,50,200,100,150,500,'2024-12-10','2024-12-15',0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00013-0000-0000-0000-000000000013','aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa','55555555-5555-5555-5555-555555555555','WH-MUMBAI-01',44,10,0,30,80,200,'2024-11-28',NULL,0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46'),('inv00014-0000-0000-0000-000000000014','aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa','55555555-5555-5555-5555-555555555555','WH-MUMBAI-01',180,20,50,50,60,150,'2024-12-05','2024-12-18',0,NULL,'2026-05-20 12:51:22','2026-05-20 08:13:46');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Stock Keeping Unit — globally unique product code',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(12,4) NOT NULL COMMENT 'Price in base currency',
  `unit_of_measure` enum('UNIT','KG','LITRE','BOX','PACK') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNIT',
  `version` bigint unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic locking version — auto-incremented by Sequelize on every save',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_sku` (`sku`),
  KEY `idx_product_category` (`category`),
  KEY `idx_product_active` (`is_active`),
  KEY `idx_product_brand_category` (`brand`,`category`),
  KEY `products_category` (`category`),
  KEY `products_is_active` (`is_active`),
  KEY `products_brand_category` (`brand`,`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master product catalog. version column enforces optimistic locking.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ELEC-LPT-001','UltraBook Pro 15','15.6\" i7 laptop','ELECTRONICS','TechBrand',75999.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ELEC-PHN-002','Quantum X12 Smartphone','6.7\" AMOLED 256GB 5G','ELECTRONICS','QuantumCo',42999.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ELEC-EAR-003','NoiseFree ANC Buds','ANC wireless earbuds','ELECTRONICS','TechBrand',5499.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ELEC-CAM-004','ProShot 4K Action Cam','Waterproof 4K/60fps','ELECTRONICS','ProShot',12499.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ELEC-TAB-005','FlexPad 11 Tablet','11\" 2K 128GB Android 14','ELECTRONICS','FlexTech',24999.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa','APRL-JKT-006','Winter Jacket Pro','Insulated waterproof jacket','APPAREL','NorthStyle',3499.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa','APRL-TSH-007','DryFit Training Tee','Moisture-wicking sports tee','APPAREL','ActiveWear',799.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa','SPRT-MAT-008','Yoga Mat Premium','Anti-slip 6mm PU mat','SPORTS','ZenFit',1299.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa','SPRT-HDT-009','Gaming Headset X3','7.1 surround noise-cancel mic','ELECTRONICS','GadgetPro',4299.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa','HOME-CHR-010','ErgoSit Office Chair','Lumbar support mesh chair','HOME','ErgoDesign',8999.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa','HOME-BLD-011','PowerBlend Pro 1200W','1200W blender stainless blades','HOME','KitchenKing',3299.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa','GROC-OIL-012','ColdPress Olive Oil 1L','Extra virgin cold-pressed oil','GROCERY','PureLeaf',899.0000,'LITRE',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa','GROC-COF-013','Coffee Blend Dark 500g','Dark roast Arabica Robusta blend','GROCERY','BrewMaster',549.0000,'UNIT',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46'),('aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa','GROC-NUT-014','Mixed Nuts Premium 1kg','Cashews almonds walnuts mix','GROCERY','NutriNuts',1199.0000,'KG',0,1,NULL,'2026-05-20 12:49:13','2026-05-20 08:13:46');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `po_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto-generated sequential PO identifier',
  `vendor_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `line_items` json NOT NULL COMMENT 'Array of { productId, quantity, unitCost }',
  `total_units` int NOT NULL DEFAULT '0',
  `total_cost` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('PENDING','APPROVED','DISPATCHED','RECEIVED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `expected_delivery_date` date DEFAULT NULL,
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'FK to users.id ? manager who raised PO',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_po_number` (`po_number`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `idx_po_status` (`status`),
  KEY `idx_po_vendor` (`vendor_id`),
  KEY `idx_po_created_at` (`created_at`),
  KEY `fk_po_created_by` (`created_by`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchase orders for stock replenishment. status tracks lifecycle.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES ('0ade0ebd-a474-48be-a8fb-99299b7b65f3','PO-2026-0011','11111111-1111-1111-1111-111111111111','[{\"quantity\": 10, \"unitCost\": 10000, \"productId\": \"aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',10,100000.00,'PENDING','','2026-05-28','usr00001-0000-0000-0000-000000000001',NULL,'2026-05-28 14:31:48','2026-05-28 14:31:48'),('0efb2c90-58ed-469c-bd00-398460346b69','PO-2026-0010','33333333-3333-3333-3333-333333333333','[{\"quantity\": 1, \"unitCost\": 0, \"productId\": \"aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',1,0.00,'CANCELLED','Nice','2026-08-27','usr00001-0000-0000-0000-000000000001',NULL,'2026-05-27 17:26:41','2026-05-27 17:27:15'),('8729fc78-9a63-464d-a93c-8aed03284f79','PO-2026-0009','44444444-4444-4444-4444-444444444444','[{\"quantity\": 1000, \"unitCost\": 80, \"productId\": \"aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',1000,80000.00,'RECEIVED','Testing product i just buyed','2026-05-23','usr00001-0000-0000-0000-000000000001',NULL,'2026-05-22 15:47:44','2026-05-27 17:12:34'),('po000001-0000-0000-0000-000000000001','PO-2024-0001','44444444-4444-4444-4444-444444444444','[{\"quantity\": 200, \"unitCost\": 3200, \"productId\": \"aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 300, \"unitCost\": 720, \"productId\": \"aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',500,856000.00,'RECEIVED','Urgent winter season replenishment','2024-12-20','usr00002-0000-0000-0000-000000000002',NULL,'2026-05-20 10:51:59','2026-05-27 17:25:53'),('po000002-0000-0000-0000-000000000002','PO-2024-0002','11111111-1111-1111-1111-111111111111','[{\"quantity\": 30, \"unitCost\": 40000, \"productId\": \"aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 60, \"unitCost\": 5000, \"productId\": \"aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 15, \"unitCost\": 72000, \"productId\": \"aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',195,2910000.00,'DISPATCHED','Monthly electronics top-up — await CFO approval','2024-12-28','usr00002-0000-0000-0000-000000000002',NULL,'2026-05-20 08:51:59','2026-05-27 17:12:30'),('po000003-0000-0000-0000-000000000003','PO-2024-0003','66666666-6666-6666-6666-666666666666','[{\"quantity\": 100, \"unitCost\": 1150, \"productId\": \"aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 200, \"unitCost\": 720, \"productId\": \"aaaa0007-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',300,259000.00,'DISPATCHED','Sports & apparel restock — in transit','2024-12-16','usr00003-0000-0000-0000-000000000003',NULL,'2026-05-19 12:51:59','2026-05-20 08:13:46'),('po000004-0000-0000-0000-000000000004','PO-2024-0004','55555555-5555-5555-5555-555555555555','[{\"quantity\": 200, \"unitCost\": 499, \"productId\": \"aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 600, \"unitCost\": 820, \"productId\": \"aaaa0012-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',800,591800.00,'PENDING','Grocery winter demand forecast replenishment','2025-01-03','usr00002-0000-0000-0000-000000000002',NULL,'2026-05-19 12:51:59','2026-05-20 08:13:46'),('po000005-0000-0000-0000-000000000005','PO-2024-0005','11111111-1111-1111-1111-111111111111','[{\"quantity\": 40, \"unitCost\": 11500, \"productId\": \"aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',40,460000.00,'RECEIVED','Action cam restock — received at WH-DELHI-01','2024-12-10','usr00003-0000-0000-0000-000000000003',NULL,'2026-05-15 12:51:59','2026-05-20 08:13:46'),('po000006-0000-0000-0000-000000000006','PO-2024-0006','22222222-2222-2222-2222-222222222222','[{\"quantity\": 40, \"unitCost\": 8200, \"productId\": \"aaaa0010-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 30, \"unitCost\": 3000, \"productId\": \"aaaa0011-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',70,418000.00,'DISPATCHED','Home & kitchen restock for Q1','2024-12-30','usr00002-0000-0000-0000-000000000002',NULL,'2026-05-18 12:51:59','2026-05-27 17:23:37'),('po000007-0000-0000-0000-000000000007','PO-2024-0007','44444444-4444-4444-4444-444444444444','[{\"quantity\": 100, \"unitCost\": 3200, \"productId\": \"aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',100,320000.00,'CANCELLED','Duplicate order — cancelled in favour of PO-0001',NULL,'usr00003-0000-0000-0000-000000000003',NULL,'2026-05-17 12:51:59','2026-05-20 08:13:46'),('po000008-0000-0000-0000-000000000008','PO-2024-0008','55555555-5555-5555-5555-555555555555','[{\"quantity\": 150, \"unitCost\": 1100, \"productId\": \"aaaa0014-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"quantity\": 200, \"unitCost\": 499, \"productId\": \"aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}]',350,264800.00,'DISPATCHED','Nuts & coffee — seasonal demand surge','2024-12-22','usr00002-0000-0000-0000-000000000002',NULL,'2026-05-20 06:51:59','2026-05-20 08:13:46');
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trend_signals`
--

DROP TABLE IF EXISTS `trend_signals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trend_signals` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `signal_source` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'GEMINI_AI | GOOGLE_TRENDS | TWITTER | SEASONAL | MANUAL',
  `signal_type` enum('DEMAND_SPIKE','DEMAND_DROP','SEASONAL_PEAK','SEASONAL_TROUGH','COMPETITOR_STOCKOUT','PRICE_SENSITIVITY','SOCIAL_BUZZ','CUSTOM') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Standardized signal category for the scoring engine',
  `signal_score` decimal(5,4) NOT NULL COMMENT 'Normalized signal strength [0.0000 – 1.0000]',
  `weight` decimal(5,4) NOT NULL DEFAULT '1.0000' COMMENT 'Relative importance weight for the scoring model',
  `raw_payload` json DEFAULT NULL COMMENT 'Full AI response blob — for audit, debugging, and reprocessing',
  `signal_date` date NOT NULL,
  `expires_at` datetime DEFAULT NULL COMMENT 'Signals past this timestamp are excluded from active forecasting',
  `ingested_at` datetime NOT NULL,
  `keyword` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'The search keyword that produced this signal (e.g., "Winter coming")',
  PRIMARY KEY (`id`),
  KEY `idx_signal_product_date` (`product_id`,`signal_date`),
  KEY `idx_signal_type_source` (`signal_type`,`signal_source`),
  KEY `idx_signal_score` (`signal_score`),
  KEY `idx_signal_expires` (`expires_at`),
  KEY `trend_signals_product_id_signal_date` (`product_id`,`signal_date`),
  KEY `trend_signals_signal_type_signal_source` (`signal_type`,`signal_source`),
  KEY `trend_signals_signal_score` (`signal_score`),
  KEY `trend_signals_expires_at` (`expires_at`),
  CONSTRAINT `trend_signals_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_signal_score_range` CHECK ((`signal_score` between 0.0000 and 1.0000)),
  CONSTRAINT `chk_weight_range` CHECK ((`weight` between 0.0000 and 10.0000))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='External trend/demand signals for forecasting. Normalized to [0,1].';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trend_signals`
--

LOCK TABLES `trend_signals` WRITE;
/*!40000 ALTER TABLE `trend_signals` DISABLE KEYS */;
INSERT INTO `trend_signals` VALUES ('sig00001-0000-0000-0000-000000000001','aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa','GOOGLE_TRENDS','DEMAND_SPIKE',0.8750,1.5000,'{\"index\": 87, \"region\": \"IN\", \"keyword\": \"Quantum X12 buy\"}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00002-0000-0000-0000-000000000002','aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa','TWITTER','SOCIAL_BUZZ',0.7200,1.2000,'{\"hashtag\": \"#QuantumX12\", \"mentions\": 14200, \"sentiment\": 0.72}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00003-0000-0000-0000-000000000003','aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa','SEASONAL','SEASONAL_PEAK',0.9000,2.0000,'{\"season\": \"Diwali\", \"totalOnHand\": 8, \"boost_factor\": 1.9}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00004-0000-0000-0000-000000000004','aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa','MANUAL','COMPETITOR_STOCKOUT',0.6500,1.0000,'{\"sku\": \"RT-LP-X\", \"competitor\": \"RivalTech\", \"totalOnHand\": 45}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00005-0000-0000-0000-000000000005','aaaa0006-aaaa-aaaa-aaaa-aaaaaaaaaaaa','SEASONAL','SEASONAL_PEAK',0.9500,2.5000,'{\"season\": \"Winter\", \"totalOnHand\": 12, \"boost_factor\": 2.4}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00006-0000-0000-0000-000000000006','aaaa0009-aaaa-aaaa-aaaa-aaaaaaaaaaaa','GOOGLE_TRENDS','DEMAND_SPIKE',0.8200,1.8000,'{\"index\": 82, \"keyword\": \"Gaming Headset buy\", \"totalOnHand\": 5}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00007-0000-0000-0000-000000000007','aaaa0013-aaaa-aaaa-aaaa-aaaaaaaaaaaa','SEASONAL','SEASONAL_PEAK',0.7800,1.5000,'{\"reason\": \"Coffee demand peaks\", \"season\": \"Winter\", \"totalOnHand\": 44}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00008-0000-0000-0000-000000000008','aaaa0005-aaaa-aaaa-aaaa-aaaaaaaaaaaa','TWITTER','SOCIAL_BUZZ',0.6300,1.1000,'{\"hashtag\": \"#FlexPad\", \"mentions\": 8900, \"sentiment\": 0.63}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00009-0000-0000-0000-000000000009','aaaa0008-aaaa-aaaa-aaaa-aaaaaaaaaaaa','GOOGLE_TRENDS','DEMAND_SPIKE',0.7100,1.4000,'{\"index\": 71, \"keyword\": \"yoga mat premium\", \"totalOnHand\": 35}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL),('sig00010-0000-0000-0000-000000000010','aaaa0004-aaaa-aaaa-aaaa-aaaaaaaaaaaa','TWITTER','SOCIAL_BUZZ',0.5500,0.9000,'{\"hashtag\": \"#ProShot4K\", \"mentions\": 4200, \"sentiment\": 0.55}','2026-05-20',NULL,'2026-05-20 12:51:38',NULL);
/*!40000 ALTER TABLE `trend_signals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'bcrypt hash — never expose in API responses',
  `role` enum('ADMIN','MANAGER','WAREHOUSE','VIEWER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VIEWER',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_user_role` (`role`),
  KEY `users_email` (`email`),
  KEY `users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='App users with RBAC roles: ADMIN | MANAGER | VIEWER';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('usr00001-0000-0000-0000-000000000001','Admin User','admin@aipulse.com','$2a$12$vjNWGDXCePOjYpPTqXTNmuR5Dg80Oad23iCe7pjYoJSfCgDg3k69e','ADMIN',1,NULL,'2026-05-20 07:28:45','2026-05-20 07:28:45'),('usr00002-0000-0000-0000-000000000002','Priya Sharma','manager1@aipulse.com','$2a$12$vjNWGDXCePOjYpPTqXTNmuR5Dg80Oad23iCe7pjYoJSfCgDg3k69e','MANAGER',1,NULL,'2026-05-20 07:28:45','2026-05-20 07:28:45'),('usr00003-0000-0000-0000-000000000003','Rohan Mehta','manager2@aipulse.com','$2a$12$vjNWGDXCePOjYpPTqXTNmuR5Dg80Oad23iCe7pjYoJSfCgDg3k69e','MANAGER',1,NULL,'2026-05-20 07:28:45','2026-05-20 07:28:45'),('usr00004-0000-0000-0000-000000000004','Ananya Singh','viewer1@aipulse.com','$2a$12$vjNWGDXCePOjYpPTqXTNmuR5Dg80Oad23iCe7pjYoJSfCgDg3k69e','VIEWER',1,NULL,'2026-05-20 07:28:45','2026-05-20 07:28:45'),('usr00005-0000-0000-0000-000000000005','Dev Patel','warehouse@aipulse.com','$2a$12$vjNWGDXCePOjYpPTqXTNmuR5Dg80Oad23iCe7pjYoJSfCgDg3k69e','WAREHOUSE',1,NULL,'2026-05-20 07:28:45','2026-05-20 07:28:45');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_low_stock_alerts`
--

DROP TABLE IF EXISTS `v_low_stock_alerts`;
/*!50001 DROP VIEW IF EXISTS `v_low_stock_alerts`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_low_stock_alerts` AS SELECT 
 1 AS `sku`,
 1 AS `product_name`,
 1 AS `category`,
 1 AS `warehouse_location`,
 1 AS `quantity_on_hand`,
 1 AS `reorder_point`,
 1 AS `safety_stock_level`,
 1 AS `units_deficit`,
 1 AS `vendor_name`,
 1 AS `avg_lead_days`,
 1 AS `next_restock_eta`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_vendor_reliability`
--

DROP TABLE IF EXISTS `v_vendor_reliability`;
/*!50001 DROP VIEW IF EXISTS `v_vendor_reliability`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_vendor_reliability` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `total_deliveries`,
 1 AS `on_time_deliveries`,
 1 AS `avg_lead_days`,
 1 AS `reliability_pct`,
 1 AS `reliability_tier`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_email` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `total_deliveries` int unsigned NOT NULL DEFAULT '0',
  `on_time_deliveries` int unsigned NOT NULL DEFAULT '0',
  `avg_lead_days` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Rolling average lead time in days',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendor_email` (`contact_email`),
  KEY `idx_vendor_active` (`is_active`),
  KEY `vendors_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Supplier/vendor master registry with reliability scoring';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES ('11111111-1111-1111-1111-111111111111','TechSupply Co.','ops@techsupply.com','+91-9000000001','42 Industrial Estate, Bengaluru',120,112,4.50,1,NULL,'2026-05-20 12:47:31','2026-05-20 08:13:45'),('22222222-2222-2222-2222-222222222222','GlobalParts Ltd.','supply@globalparts.io','+91-9000000002','18 Export Zone, Chennai',80,58,7.20,1,NULL,'2026-05-20 12:47:31','2026-05-20 08:13:46'),('33333333-3333-3333-3333-333333333333','FastStock Pvt.','hello@faststock.in','+91-9000000003','5 Warehouse Hub, Pune',200,195,2.10,1,NULL,'2026-05-20 12:47:31','2026-05-20 08:13:46'),('44444444-4444-4444-4444-444444444444','FabricWorld','orders@fabricworld.co.in','+91-9000000004','88 Textile Park, Surat',160,138,5.80,1,NULL,'2026-05-20 12:47:31','2026-05-20 08:13:46'),('55555555-5555-5555-5555-555555555555','BrewHouse Co.','supply@brewhouse.com','+91-9000000005','12 Food Park, Hyderabad',95,90,3.20,1,NULL,'2026-05-20 12:47:31','2026-05-20 08:13:46'),('66666666-6666-6666-6666-666666666666','SportZone India','biz@sportzone.in','+91-9000000006','77 Sports Complex, Noida',70,52,6.00,1,NULL,'2026-05-20 12:47:31','2026-05-20 08:13:46');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_low_stock_alerts`
--

/*!50001 DROP VIEW IF EXISTS `v_low_stock_alerts`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_low_stock_alerts` AS select `p`.`sku` AS `sku`,`p`.`name` AS `product_name`,`p`.`category` AS `category`,`i`.`warehouse_location` AS `warehouse_location`,`i`.`quantity_on_hand` AS `quantity_on_hand`,`i`.`reorder_point` AS `reorder_point`,`i`.`safety_stock_level` AS `safety_stock_level`,(`i`.`reorder_point` - `i`.`quantity_on_hand`) AS `units_deficit`,`v`.`name` AS `vendor_name`,`v`.`avg_lead_days` AS `avg_lead_days`,`i`.`next_restock_eta` AS `next_restock_eta` from ((`inventory` `i` join `products` `p` on((`p`.`id` = `i`.`product_id`))) join `vendors` `v` on((`v`.`id` = `i`.`vendor_id`))) where ((`i`.`quantity_on_hand` <= `i`.`reorder_point`) and (`p`.`is_active` = 1)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_vendor_reliability`
--

/*!50001 DROP VIEW IF EXISTS `v_vendor_reliability`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_vendor_reliability` AS select `vendors`.`id` AS `id`,`vendors`.`name` AS `name`,`vendors`.`total_deliveries` AS `total_deliveries`,`vendors`.`on_time_deliveries` AS `on_time_deliveries`,`vendors`.`avg_lead_days` AS `avg_lead_days`,(case when (`vendors`.`total_deliveries` = 0) then NULL else round(((`vendors`.`on_time_deliveries` / `vendors`.`total_deliveries`) * 100),2) end) AS `reliability_pct`,(case when (`vendors`.`total_deliveries` = 0) then 'UNRATED' when ((`vendors`.`on_time_deliveries` / `vendors`.`total_deliveries`) >= 0.90) then 'GOLD' when ((`vendors`.`on_time_deliveries` / `vendors`.`total_deliveries`) >= 0.75) then 'SILVER' else 'AT_RISK' end) AS `reliability_tier` from `vendors` where (`vendors`.`is_active` = 1) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-16 15:02:39
