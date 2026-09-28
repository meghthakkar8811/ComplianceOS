-- ============================================================
-- ComplianceOS — MySQL Database Schema
-- Run this file once to set up the entire database
-- ============================================================

CREATE DATABASE IF NOT EXISTS complianceos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE complianceos;

-- ── TENANTS (Companies) ─────────────────────────────────────
CREATE TABLE tenants (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    company_name    VARCHAR(255) NOT NULL,
    plan            ENUM('STARTER','PROFESSIONAL','ENTERPRISE','CONSULTANT') DEFAULT 'STARTER',
    billing_email   VARCHAR(255) NOT NULL,
    is_active       TINYINT(1) DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id           CHAR(36) NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255),
    phone               VARCHAR(20),
    role                ENUM('MINE_OWNER','MINE_MANAGER','SAFETY_OFFICER','DATA_ENTRY','AUDITOR_READONLY') DEFAULT 'MINE_MANAGER',
    auth_provider       ENUM('EMAIL','GOOGLE') DEFAULT 'EMAIL',
    google_id           VARCHAR(255),
    avatar_url          VARCHAR(500),
    email_verified      TINYINT(1) DEFAULT 0,
    verification_code   VARCHAR(10),
    verification_expiry DATETIME,
    reset_token         VARCHAR(255),
    reset_expiry        DATETIME,
    is_active           TINYINT(1) DEFAULT 1,
    last_login          DATETIME,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_email (email),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_google (google_id)
);

-- ── SESSIONS ────────────────────────────────────────────────
CREATE TABLE sessions (
    id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id     CHAR(36) NOT NULL,
    tenant_id   CHAR(36) NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    ip_address  VARCHAR(64),
    user_agent  VARCHAR(500),
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token_hash),
    INDEX idx_user (user_id)
);

-- ── MINES ───────────────────────────────────────────────────
CREATE TABLE mines (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id           CHAR(36) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    lease_number        VARCHAR(100) NOT NULL,
    state               VARCHAR(50) NOT NULL,
    district            VARCHAR(100),
    mineral             VARCHAR(50) NOT NULL,
    mine_type           ENUM('METALLIFEROUS','COAL') DEFAULT 'METALLIFEROUS',
    lease_area_hectares DECIMAL(10,2),
    lease_start_date    DATE,
    lease_end_date      DATE,
    is_active           TINYINT(1) DEFAULT 1,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id)
);

-- ── ROYALTY RATES (Reference data) ─────────────────────────
CREATE TABLE royalty_rates (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    state               VARCHAR(50) NOT NULL,
    mineral             VARCHAR(50) NOT NULL,
    rate_paise_per_mt   BIGINT NOT NULL,
    dmf_percent         DECIMAL(5,2) DEFAULT 30.00,
    nmet_percent        DECIMAL(5,2) DEFAULT 2.00,
    source_citation     VARCHAR(255) DEFAULT 'MMDR Schedule II',
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rate (state, mineral, effective_from),
    INDEX idx_lookup (state, mineral)
);

-- ── PRODUCTION ENTRIES ──────────────────────────────────────
CREATE TABLE production_entries (
    id                      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id               CHAR(36) NOT NULL,
    mine_id                 CHAR(36) NOT NULL,
    entry_date              DATE NOT NULL,
    shift                   ENUM('MORNING','AFTERNOON','NIGHT') NOT NULL,
    pit_section             VARCHAR(100) NOT NULL,
    mineral_grade           VARCHAR(100) NOT NULL,
    quantity_produced_mt    DECIMAL(12,3) DEFAULT 0,
    quantity_dispatched_mt  DECIMAL(12,3) DEFAULT 0,
    supervisor_name         VARCHAR(255),
    remarks                 TEXT,
    status                  ENUM('PENDING','VERIFIED') DEFAULT 'PENDING',
    created_by              CHAR(36) NOT NULL,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE,
    INDEX idx_mine_date (mine_id, entry_date)
);

-- ── ROYALTY CALCULATIONS ────────────────────────────────────
CREATE TABLE royalty_calculations (
    id                      CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id               CHAR(36) NOT NULL,
    mine_id                 CHAR(36) NOT NULL,
    period_month            DATE NOT NULL,
    quantity_mt             DECIMAL(12,3) NOT NULL,
    rate_paise_per_mt       BIGINT NOT NULL,
    base_royalty_paise      BIGINT NOT NULL,
    dmf_paise               BIGINT NOT NULL,
    nmet_paise              BIGINT NOT NULL,
    gross_liability_paise   BIGINT NOT NULL,
    advance_paid_paise      BIGINT DEFAULT 0,
    net_due_paise           BIGINT NOT NULL,
    challan_number          VARCHAR(100),
    challan_status          ENUM('DRAFT','GENERATED','PAID') DEFAULT 'DRAFT',
    created_by              CHAR(36) NOT NULL,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE,
    UNIQUE KEY unique_calc (tenant_id, mine_id, period_month),
    INDEX idx_mine (mine_id)
);

-- ── COMPLIANCE DEADLINES ────────────────────────────────────
CREATE TABLE compliance_deadlines (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id       CHAR(36) NOT NULL,
    mine_id         CHAR(36) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    authority       ENUM('IBM','DGMS','STATE_DME','SPCB','FOREST') NOT NULL,
    due_date        DATE NOT NULL,
    status          ENUM('PENDING','SUBMITTED','OVERDUE') DEFAULT 'PENDING',
    submitted_at    DATETIME,
    reference_number VARCHAR(100),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE,
    INDEX idx_mine_due (mine_id, due_date),
    INDEX idx_tenant (tenant_id)
);

-- ── COMPLIANCE DOCUMENTS ────────────────────────────────────
CREATE TABLE compliance_documents (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id       CHAR(36) NOT NULL,
    mine_id         CHAR(36) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        ENUM('LEASE','ENVIRONMENTAL','DGMS_CERT','OTHER') NOT NULL,
    document_type   VARCHAR(100) NOT NULL,
    file_path       VARCHAR(500),
    issued_date     DATE,
    expiry_date     DATE,
    uploaded_by     CHAR(36) NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (mine_id) REFERENCES mines(id) ON DELETE CASCADE,
    INDEX idx_expiry (expiry_date)
);

-- ── DGMS REGISTER STATUS ────────────────────────────────────
CREATE TABLE dgms_register_status (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id           CHAR(36) NOT NULL,
    mine_id             CHAR(36) NOT NULL,
    register_code       VARCHAR(50) NOT NULL,
    register_name       VARCHAR(255) NOT NULL,
    regulation_ref      VARCHAR(100),
    last_updated_at     DATETIME NOT NULL,
    max_days_allowed    INT DEFAULT 7,
    notes               TEXT,
    UNIQUE KEY unique_register (mine_id, register_code),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_mine (mine_id)
);

-- ── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE audit_log (
    id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id   CHAR(36),
    user_id     CHAR(36),
    mine_id     CHAR(36),
    entity_type VARCHAR(100) NOT NULL,
    entity_id   CHAR(36),
    action      ENUM('CREATE','UPDATE','DELETE','SUBMIT','DOWNLOAD','LOGIN','LOGOUT') NOT NULL,
    ip_address  VARCHAR(64),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_created (created_at)
);

-- ── SEED: ROYALTY RATES (8 states × 8 minerals) ─────────────
INSERT INTO royalty_rates (state, mineral, rate_paise_per_mt, source_citation, effective_from) VALUES
-- RAJASTHAN
('RAJASTHAN','LIMESTONE',1125,'MMDR Schedule II — Mar 2024','2024-03-01'),
('RAJASTHAN','IRON_ORE',9500,'MMDR Schedule II — Jan 2024','2024-01-01'),
('RAJASTHAN','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('RAJASTHAN','BAUXITE',900,'MMDR Schedule II — Jan 2024','2024-01-01'),
('RAJASTHAN','MANGANESE',4500,'MMDR Schedule II — Jan 2024','2024-01-01'),
('RAJASTHAN','CHROMITE',2800,'MMDR Schedule II — Jan 2024','2024-01-01'),
('RAJASTHAN','DOLOMITE',750,'MMDR Schedule II — Jan 2024','2024-01-01'),
('RAJASTHAN','GRANITE',4000,'MMDR Schedule II — Jan 2024','2024-01-01'),
-- GUJARAT
('GUJARAT','LIMESTONE',1250,'MMDR Schedule II — Apr 2024','2024-04-01'),
('GUJARAT','IRON_ORE',8800,'MMDR Schedule II — Apr 2024','2024-04-01'),
('GUJARAT','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('GUJARAT','BAUXITE',1200,'MMDR Schedule II — Apr 2024','2024-04-01'),
('GUJARAT','MANGANESE',4400,'MMDR Schedule II — Apr 2024','2024-04-01'),
('GUJARAT','CHROMITE',2700,'MMDR Schedule II — Apr 2024','2024-04-01'),
('GUJARAT','DOLOMITE',825,'MMDR Schedule II — Apr 2024','2024-04-01'),
('GUJARAT','GRANITE',3700,'MMDR Schedule II — Apr 2024','2024-04-01'),
-- ODISHA
('ODISHA','LIMESTONE',1200,'MMDR Schedule II — Mar 2024','2024-03-01'),
('ODISHA','IRON_ORE',8500,'MMDR Schedule II — Jan 2024','2024-01-01'),
('ODISHA','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('ODISHA','BAUXITE',1100,'MMDR Schedule II — Jan 2024','2024-01-01'),
('ODISHA','MANGANESE',4800,'MMDR Schedule II — Jan 2024','2024-01-01'),
('ODISHA','CHROMITE',3000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('ODISHA','DOLOMITE',800,'MMDR Schedule II — Jan 2024','2024-01-01'),
('ODISHA','GRANITE',3800,'MMDR Schedule II — Jan 2024','2024-01-01'),
-- JHARKHAND
('JHARKHAND','LIMESTONE',1050,'MMDR Schedule II — Jan 2024','2024-01-01'),
('JHARKHAND','IRON_ORE',8000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('JHARKHAND','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('JHARKHAND','BAUXITE',850,'MMDR Schedule II — Jan 2024','2024-01-01'),
('JHARKHAND','MANGANESE',4200,'MMDR Schedule II — Jan 2024','2024-01-01'),
('JHARKHAND','CHROMITE',2500,'MMDR Schedule II — Jan 2024','2024-01-01'),
('JHARKHAND','DOLOMITE',650,'MMDR Schedule II — Jan 2024','2024-01-01'),
('JHARKHAND','GRANITE',3500,'MMDR Schedule II — Jan 2024','2024-01-01'),
-- CHHATTISGARH
('CHHATTISGARH','LIMESTONE',1000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('CHHATTISGARH','IRON_ORE',7800,'MMDR Schedule II — Jan 2024','2024-01-01'),
('CHHATTISGARH','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('CHHATTISGARH','BAUXITE',800,'MMDR Schedule II — Jan 2024','2024-01-01'),
('CHHATTISGARH','MANGANESE',4000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('CHHATTISGARH','CHROMITE',2200,'MMDR Schedule II — Jan 2024','2024-01-01'),
('CHHATTISGARH','DOLOMITE',600,'MMDR Schedule II — Jan 2024','2024-01-01'),
('CHHATTISGARH','GRANITE',3200,'MMDR Schedule II — Jan 2024','2024-01-01'),
-- MADHYA PRADESH
('MADHYA_PRADESH','LIMESTONE',1075,'MMDR Schedule II — Feb 2024','2024-02-01'),
('MADHYA_PRADESH','IRON_ORE',8200,'MMDR Schedule II — Jan 2024','2024-01-01'),
('MADHYA_PRADESH','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('MADHYA_PRADESH','BAUXITE',825,'MMDR Schedule II — Jan 2024','2024-01-01'),
('MADHYA_PRADESH','MANGANESE',4100,'MMDR Schedule II — Jan 2024','2024-01-01'),
('MADHYA_PRADESH','CHROMITE',2400,'MMDR Schedule II — Jan 2024','2024-01-01'),
('MADHYA_PRADESH','DOLOMITE',675,'MMDR Schedule II — Jan 2024','2024-01-01'),
('MADHYA_PRADESH','GRANITE',3300,'MMDR Schedule II — Jan 2024','2024-01-01'),
-- GOA
('GOA','LIMESTONE',1300,'MMDR Schedule II — Jan 2024','2024-01-01'),
('GOA','IRON_ORE',10000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('GOA','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('GOA','BAUXITE',1000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('GOA','MANGANESE',5000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('GOA','CHROMITE',3200,'MMDR Schedule II — Jan 2024','2024-01-01'),
('GOA','DOLOMITE',900,'MMDR Schedule II — Jan 2024','2024-01-01'),
('GOA','GRANITE',4500,'MMDR Schedule II — Jan 2024','2024-01-01'),
-- KARNATAKA
('KARNATAKA','LIMESTONE',1150,'MMDR Schedule II — Jan 2024','2024-01-01'),
('KARNATAKA','IRON_ORE',9000,'MMDR Schedule II — Jan 2024','2024-01-01'),
('KARNATAKA','COAL',1400,'MMDR Schedule II — Jan 2023','2023-01-01'),
('KARNATAKA','BAUXITE',950,'MMDR Schedule II — Jan 2024','2024-01-01'),
('KARNATAKA','MANGANESE',4600,'MMDR Schedule II — Jan 2024','2024-01-01'),
('KARNATAKA','CHROMITE',2900,'MMDR Schedule II — Jan 2024','2024-01-01'),
('KARNATAKA','DOLOMITE',775,'MMDR Schedule II — Jan 2024','2024-01-01'),
('KARNATAKA','GRANITE',4200,'MMDR Schedule II — Jan 2024','2024-01-01');
