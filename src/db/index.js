const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', '..', 'data', 'pdd_analysis.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS pdd_products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    goods_id    TEXT UNIQUE NOT NULL,
    name        TEXT,
    shop_name   TEXT,
    price       REAL,
    sales_count INTEGER,
    keyword     TEXT,
    fetched_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pdd_reviews (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    goods_id     TEXT NOT NULL,
    review_id    TEXT UNIQUE,
    content      TEXT NOT NULL,
    rating       INTEGER,
    user_name    TEXT,
    user_gender  TEXT,
    user_age     TEXT,
    sku_name     TEXT,
    reply_count  INTEGER DEFAULT 0,
    like_count   INTEGER DEFAULT 0,
    created_at   TEXT,
    fetched_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pdd_analyses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    goods_id     TEXT NOT NULL,
    keyword      TEXT,
    review_count INTEGER,
    result       TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
