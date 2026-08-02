// Run once to create all tables: node server/setup-db.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const mysql = require('mysql2/promise');

async function setup() {
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     Number(process.env.MYSQL_PORT || 3306),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true,
  });

  console.log('Connected. Creating tables...');

  await conn.query('SET FOREIGN_KEY_CHECKS=0');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name          VARCHAR(255),
      plan          VARCHAR(50)  DEFAULT 'basic',
      created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS people (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      user_id       INT NOT NULL,
      full_name     VARCHAR(255),
      birth_name    VARCHAR(255),
      also_known_as VARCHAR(255),
      sex           VARCHAR(50),
      race_ethnicity VARCHAR(255),
      birth_date    VARCHAR(100),
      birth_place   VARCHAR(255),
      death_date    VARCHAR(100),
      death_place   VARCHAR(255),
      burial_place  VARCHAR(255),
      generation_number VARCHAR(50),
      relation_to_self VARCHAR(255),
      line          VARCHAR(50),
      ancestry_profile_url VARCHAR(500),
      family_search_id     VARCHAR(100),
      geni_profile_url     VARCHAR(500),
      photo_url     VARCHAR(500),
      notes         TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS family_connections (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      child_id   INT NOT NULL,
      father_id  INT,
      mother_id  INT,
      UNIQUE KEY uq_child (user_id, child_id),
      FOREIGN KEY (user_id)   REFERENCES users(id)  ON DELETE CASCADE,
      FOREIGN KEY (child_id)  REFERENCES people(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS research_questions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT NOT NULL,
      question        TEXT,
      research_type   VARCHAR(100),
      status          VARCHAR(100),
      priority        VARCHAR(50),
      date_opened     VARCHAR(100),
      date_resolved   VARCHAR(100),
      conclusion      TEXT,
      next_action     TEXT,
      notes           TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS sources (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT NOT NULL,
      name            VARCHAR(500),
      source_type     VARCHAR(100),
      repository      VARCHAR(255),
      url             VARCHAR(500),
      full_citation   TEXT,
      short_citation  TEXT,
      date_of_source  VARCHAR(100),
      date_accessed   VARCHAR(100),
      notes           TEXT,
      source_file_url VARCHAR(500),
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS research_log (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      title       VARCHAR(500),
      date        VARCHAR(100),
      summary     TEXT,
      notes       TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS dna_testing (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      name        VARCHAR(255),
      company     VARCHAR(100),
      test_date   VARCHAR(100),
      kit_number  VARCHAR(100),
      notes       TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS dna_matches (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT NOT NULL,
      match_name      VARCHAR(255),
      shared_cm       DECIMAL(10,2),
      relationship    VARCHAR(100),
      company         VARCHAR(100),
      notes           TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS archives (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      name        VARCHAR(500),
      description TEXT,
      image_url   VARCHAR(500),
      metadata    JSON,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS collections (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      name        VARCHAR(500),
      description TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  console.log('✅  All tables created successfully.');
  await conn.end();
}

setup().catch(err => { console.error('Setup failed:', err.message); process.exit(1); });
