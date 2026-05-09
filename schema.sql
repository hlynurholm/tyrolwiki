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
