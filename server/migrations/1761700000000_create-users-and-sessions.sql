-- Up Migration

CREATE TABLE users (
  id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username           text        NOT NULL,
  email              text        NOT NULL,   -- the app stores it lowercased
  password_hash      text        NOT NULL,   -- argon2id; the salt is inside the hash
  is_admin           boolean     NOT NULL DEFAULT false,
  email_verified_at  timestamptz,            -- NULL until email verification exists
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_login_at      timestamptz,

  -- The database enforces the same rules as the API, as a last line of defense.
  CONSTRAINT users_username_format CHECK (username ~ '^[A-Za-z0-9_]{3,20}$'),
  CONSTRAINT users_email_length    CHECK (char_length(email) BETWEEN 3 AND 254)
);

-- "Dan" and "dan" must not both exist, so uniqueness ignores letter case.
CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username));
CREATE UNIQUE INDEX users_email_lower_key    ON users (lower(email));

CREATE TABLE sessions (
  token_hash  text        PRIMARY KEY,   -- SHA-256 of the cookie's token, never the token itself
  user_id     integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx    ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- Down Migration

DROP TABLE sessions;
DROP TABLE users;
