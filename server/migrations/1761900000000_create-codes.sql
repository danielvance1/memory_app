-- Up Migration

-- One row per code a user has set, e.g. user 7's code "042" stands for "a dog on a skateboard".
-- Rows are created only when a user sets a code (nothing is pre-filled), and the app never
-- deletes them: clearing a code's text just leaves the row with blank text, and switching
-- code systems leaves rows from the other systems alone. They go away only if the whole
-- account is deleted.
CREATE TABLE codes (
  id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code     text    NOT NULL,                -- text, not a number, so "007" keeps its zeros
  text     text    NOT NULL DEFAULT '',     -- blank means "not set"

  -- The database enforces the same rules as the API, as a last line of defense.
  CONSTRAINT codes_code_format  CHECK (code ~ '^[0-9]{1,3}$'),
  CONSTRAINT codes_text_trimmed CHECK (text !~ '^\s' AND text !~ '\s$'),
  CONSTRAINT codes_text_length  CHECK (char_length(text) <= 200)
);

-- A user has at most one row per code.
CREATE UNIQUE INDEX codes_user_code_key ON codes (user_id, code);

-- A user can't use the same text for two codes, ignoring letter case. Blank text is
-- exempt (the WHERE), so any number of cleared codes can sit side by side.
CREATE UNIQUE INDEX codes_user_text_key ON codes (user_id, lower(text)) WHERE text <> '';

-- Down Migration

DROP TABLE codes;
