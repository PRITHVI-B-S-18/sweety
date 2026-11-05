CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_unique    UNIQUE (email),
    CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE readings (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL,
    reading_date DATE NOT NULL,
    slot         TEXT NOT NULL,
    value        SMALLINT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT readings_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT readings_slot_valid
        CHECK (slot IN ('fasting', 'after_breakfast', 'after_lunch', 'after_dinner')),
    CONSTRAINT readings_value_range
        CHECK (value BETWEEN 40 AND 600),
    CONSTRAINT readings_one_per_slot
        UNIQUE (user_id, reading_date, slot)
);