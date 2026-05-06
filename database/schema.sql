-- =============================================================
-- AI-Pulse | Predictive Inventory Management System
-- Database Schema — MySQL 8.x | Normalization: 3NF
-- =============================================================

CREATE DATABASE IF NOT EXISTS ai_pulse_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_pulse_db;

-- =============================================================
-- TABLE: vendors
-- Stores supplier/vendor master data.
-- Separated from inventory to honour 2NF.
-- =============================================================
CREATE TABLE vendors (
    id                  CHAR(36)        NOT NULL DEFAULT (UUID()),
    name                VARCHAR(255)    NOT NULL,
    contact_email       VARCHAR(320)    NOT NULL,
    contact_phone       VARCHAR(20)     NULL,
    address             TEXT            NULL,
    total_deliveries    INT UNSIGNED    NOT NULL DEFAULT 0,
    on_time_deliveries  INT UNSIGNED    NOT NULL DEFAULT 0,
    avg_lead_days       DECIMAL(5, 2)   NOT NULL DEFAULT 0.00  COMMENT 'Rolling average lead time in days',
    is_active           TINYINT(1)      NOT NULL DEFAULT 1,
    deleted_at          DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_vendor_email (contact_email),
    INDEX idx_vendor_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Supplier/vendor master registry with reliability scoring';


-- =============================================================
-- TABLE: products
-- Master product catalog (SKU registry).
-- `version` implements Optimistic Locking — MUST be incremented
-- on every UPDATE. Stale writes are rejected (HTTP 409).
-- =============================================================
CREATE TABLE products (
    id              CHAR(36)        NOT NULL DEFAULT (UUID()),
    sku             VARCHAR(100)    NOT NULL  COMMENT 'Stock Keeping Unit — globally unique product code',
    name            VARCHAR(255)    NOT NULL,
    description     TEXT            NULL,
    category        VARCHAR(100)    NOT NULL,
    brand           VARCHAR(100)    NULL,
    unit_price      DECIMAL(12, 4)  NOT NULL,
    unit_of_measure VARCHAR(20)     NOT NULL DEFAULT 'UNIT' COMMENT 'UNIT | KG | LITRE | BOX',

    -- ⚡ OPTIMISTIC LOCKING — Clients must echo this back on every PUT.
    -- Server runs: WHERE id=? AND version=?  then increments.
    -- affectedRows=0 → conflict → 409.
    version         BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Optimistic locking version counter',

    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    deleted_at      DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_product_sku (sku),
    INDEX idx_product_category (category),
    INDEX idx_product_active (is_active),
    INDEX idx_product_brand_category (brand, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Master product catalog. version column enforces optimistic locking.';


-- =============================================================
-- TABLE: inventory
-- Current stock state per product per warehouse location.
-- Separated from products (3NF) — quantities change frequently.
-- Composite unique key: (product_id + warehouse_location).
-- =============================================================
CREATE TABLE inventory (
    id                  CHAR(36)        NOT NULL DEFAULT (UUID()),
    product_id          CHAR(36)        NOT NULL,
    vendor_id           CHAR(36)        NOT NULL  COMMENT 'Primary vendor for replenishment',
    warehouse_location  VARCHAR(100)    NOT NULL DEFAULT 'DEFAULT',

    quantity_on_hand    INT             NOT NULL DEFAULT 0  COMMENT 'Current physical stock count',
    quantity_reserved   INT             NOT NULL DEFAULT 0  COMMENT 'Committed to open orders (soft lock)',
    quantity_on_order   INT             NOT NULL DEFAULT 0  COMMENT 'In transit from vendor',

    -- Available = quantity_on_hand - quantity_reserved
    safety_stock_level  INT             NOT NULL DEFAULT 0  COMMENT 'Minimum buffer before alert is raised',
    reorder_point       INT             NOT NULL DEFAULT 0  COMMENT 'Level at which PO should be triggered',
    reorder_quantity    INT             NOT NULL DEFAULT 0  COMMENT 'Standard order batch size (EOQ)',

    last_restock_date   DATE            NULL,
    next_restock_eta    DATE            NULL,

    -- ⚡ OPTIMISTIC LOCKING — matches inventory.model.js `version` field
    version             BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'OCC version — incremented on every stock update',

    -- Sequelize paranoid soft-delete — matches db.config.js `paranoid: true`
    deleted_at          DATETIME        NULL,

    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_product_location (product_id, warehouse_location),
    INDEX idx_inventory_vendor     (vendor_id),
    INDEX idx_inventory_low_stock  (quantity_on_hand, reorder_point),
    INDEX idx_inventory_version    (version),

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_vendor
        FOREIGN KEY (vendor_id)  REFERENCES vendors  (id) ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT chk_qty_on_hand   CHECK (quantity_on_hand  >= 0),
    CONSTRAINT chk_qty_reserved  CHECK (quantity_reserved >= 0),
    CONSTRAINT chk_qty_on_order  CHECK (quantity_on_order >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Real-time inventory state per product per warehouse. version enforces OCC.';


-- =============================================================
-- TABLE: trend_signals
-- External demand/trend data points correlated to products.
-- Sources: Google Trends, social media, competitor alerts, etc.
-- signal_score normalized to [0.0000, 1.0000].
-- =============================================================
CREATE TABLE trend_signals (
    id              CHAR(36)        NOT NULL DEFAULT (UUID()),
    product_id      CHAR(36)        NOT NULL,

    signal_source   VARCHAR(100)    NOT NULL  COMMENT 'GOOGLE_TRENDS | TWITTER | SEASONAL | MANUAL',
    signal_type     ENUM(
                        'DEMAND_SPIKE',
                        'DEMAND_DROP',
                        'SEASONAL_PEAK',
                        'SEASONAL_TROUGH',
                        'COMPETITOR_STOCKOUT',
                        'PRICE_SENSITIVITY',
                        'SOCIAL_BUZZ',
                        'CUSTOM'
                    )               NOT NULL,

    -- Normalized score: 1.00 = max bullish demand, 0.00 = strongly bearish
    signal_score    DECIMAL(5, 4)   NOT NULL  COMMENT 'Normalized signal strength [0.0000 – 1.0000]',
    weight          DECIMAL(5, 4)   NOT NULL DEFAULT 1.0000 COMMENT 'Relative importance for scoring model',
    raw_payload     JSON            NULL      COMMENT 'Original source data for audit/reprocessing',

    signal_date     DATE            NOT NULL,
    expires_at      DATETIME        NULL      COMMENT 'Signals past this timestamp excluded from forecasting',
    ingested_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_signal_product_date (product_id, signal_date),
    INDEX idx_signal_type_source  (signal_type, signal_source),
    INDEX idx_signal_score        (signal_score),
    INDEX idx_signal_expires      (expires_at),

    CONSTRAINT fk_signal_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_signal_score_range CHECK (signal_score BETWEEN 0.0000 AND 1.0000),
    CONSTRAINT chk_weight_range       CHECK (weight       BETWEEN 0.0000 AND 10.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='External trend/demand signals for forecasting. Normalized to [0,1].';


-- =============================================================
-- VIEWS
-- =============================================================

-- Vendor reliability tier (GOLD / SILVER / AT_RISK)
CREATE OR REPLACE VIEW v_vendor_reliability AS
SELECT
    id,
    name,
    total_deliveries,
    on_time_deliveries,
    avg_lead_days,
    CASE
        WHEN total_deliveries = 0 THEN NULL
        ELSE ROUND((on_time_deliveries / total_deliveries) * 100, 2)
    END AS reliability_pct,
    CASE
        WHEN total_deliveries = 0                                   THEN 'UNRATED'
        WHEN (on_time_deliveries / total_deliveries) >= 0.90        THEN 'GOLD'
        WHEN (on_time_deliveries / total_deliveries) >= 0.75        THEN 'SILVER'
        ELSE 'AT_RISK'
    END AS reliability_tier
FROM vendors
WHERE is_active = 1;


-- Products currently below their reorder point
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT
    p.sku,
    p.name                                           AS product_name,
    p.category,
    i.warehouse_location,
    i.quantity_on_hand,
    i.reorder_point,
    i.safety_stock_level,
    (i.reorder_point - i.quantity_on_hand)           AS units_deficit,
    v.name                                           AS vendor_name,
    v.avg_lead_days,
    i.next_restock_eta
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN vendors  v ON v.id = i.vendor_id
WHERE i.quantity_on_hand <= i.reorder_point
  AND p.is_active = 1;
