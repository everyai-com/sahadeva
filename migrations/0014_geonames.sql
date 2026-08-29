CREATE TABLE geonames_locations (
  geoname_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  ascii_name TEXT NOT NULL,
  alternate_names TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  country_code TEXT NOT NULL,
  admin1_code TEXT,
  population INTEGER NOT NULL,
  timezone TEXT NOT NULL
);
CREATE INDEX geonames_name_idx ON geonames_locations(name COLLATE NOCASE);
CREATE INDEX geonames_ascii_idx ON geonames_locations(ascii_name COLLATE NOCASE);
CREATE INDEX geonames_population_idx ON geonames_locations(population DESC);
