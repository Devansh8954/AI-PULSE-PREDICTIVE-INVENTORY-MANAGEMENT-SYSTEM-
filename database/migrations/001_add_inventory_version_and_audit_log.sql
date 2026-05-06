-- =============================================================
-- AI-Pulse | Migration: Add version column to inventory table
-- Run ONCE on existing databases that were created WITHOUT
-- the version column. Skip if running schema.sql fresh.
-- =============================================================

USE ai_pulse_db;

-- Add version column for Optimistic Locking on inventory table
ALTER TABLE inventory
  ADD COLUMN version BIGINT UNSIGNED NOT NULL DEFAULT 0
  COMMENT 'Optimistic locking version — incremented on every stock update'
  AFTER next_restock_eta;

-- Add inventory_audit_log table for updateStock() history
CREATE TABLE IF NOT EXISTS inventory_audit_log (
    id               CHAR(36)     NOT NULL DEFAULT (UUID()),
    inventory_id     CHAR(36)     NOT NULL,
    delta            INT          NOT NULL COMMENT 'Units added (+) or removed (-)',
    reason           TEXT         NULL,
    updated_by       VARCHAR(255) NOT NULL DEFAULT 'system',
    snapshot_version BIGINT       NOT NULL COMMENT 'Version AFTER the update',
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_audit_inventory_id (inventory_id),
    INDEX idx_audit_created_at   (created_at),

    CONSTRAINT fk_audit_inventory
        FOREIGN KEY (inventory_id) REFERENCES inventory (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit log for all inventory stock adjustments';
