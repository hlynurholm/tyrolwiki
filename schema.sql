CREATE TABLE IF NOT EXISTS beers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  style TEXT,
  brewery TEXT,
  country TEXT,
  abv REAL,
  ratings TEXT NOT NULL DEFAULT '{}',
  avg REAL,
  rating_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vinbudin_beers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brewery TEXT,
  style TEXT,
  abv REAL,
  image_url TEXT,
  product_url TEXT,
  synced_at TEXT NOT NULL
);
