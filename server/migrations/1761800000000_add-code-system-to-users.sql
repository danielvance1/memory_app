-- Up Migration

-- Which code system the user memorizes with: 1, 2 or 3 digits per code.
-- The DEFAULT means every existing user, and every new signup, starts on 1.
ALTER TABLE users
  ADD COLUMN code_system smallint NOT NULL DEFAULT 1,
  ADD CONSTRAINT users_code_system_range CHECK (code_system BETWEEN 1 AND 3);

-- Down Migration

ALTER TABLE users
  DROP CONSTRAINT users_code_system_range,
  DROP COLUMN code_system;
