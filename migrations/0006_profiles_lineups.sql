ALTER TABLE players ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE players ADD COLUMN updated_at TEXT;

CREATE TABLE lineups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
  player_ids_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX lineups_owner ON lineups(user_id, updated_at);
