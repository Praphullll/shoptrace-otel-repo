-- ─────────────────────────────────────────────────────────
-- ShopTrace Simple — Database Schema
-- ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table (simple — one product per order for clarity)
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_email VARCHAR(255) NOT NULL,
  product_id     UUID REFERENCES products(id),
  product_name   VARCHAR(255),
  quantity       INTEGER NOT NULL,
  total_amount   NUMERIC(10, 2) NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'confirmed',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed products
INSERT INTO products (name, description, price, stock) VALUES
  ('Wireless Keyboard',  'Compact Bluetooth keyboard',   49.99, 100),
  ('USB-C Hub',          '7-in-1 hub with HDMI and PD', 34.99, 200),
  ('Desk Lamp',          'Adjustable LED desk lamp',     29.99,  50),
  ('Webcam 1080p',       'Full HD webcam with mic',      59.99,  75),
  ('Mousepad XL',        'Extended gaming mousepad',     19.99, 150);
