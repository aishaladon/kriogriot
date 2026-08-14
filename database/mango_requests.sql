-- Run this in phpMyAdmin on the u106934582_kriogriot database.
-- Select the database first, then paste into the SQL tab and click Go.

CREATE TABLE mango_requests (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  question          TEXT,
  ancestor_name     VARCHAR(200),
  state             VARCHAR(60),
  era               VARCHAR(40),
  email             VARCHAR(200) NOT NULL,
  phone_cc          VARCHAR(8),
  phone             VARCHAR(40) NOT NULL,
  consent_delivery  TINYINT(1) NOT NULL DEFAULT 0,
  consent_community TINYINT(1) NOT NULL DEFAULT 0,
  consent_text      TEXT NOT NULL,
  consent_at        DATETIME NOT NULL,
  ip                VARCHAR(45),
  user_agent        VARCHAR(255),
  status            VARCHAR(30) NOT NULL DEFAULT 'new',
  notes             TEXT,
  UNIQUE KEY uniq_email (email),
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
