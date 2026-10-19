-- Runs automatically the first time the PostgreSQL container starts with an empty volume
CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    content    TEXT,
    filename   VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notes (title, content) VALUES
    ('Welcome!', 'This note was inserted by database/init.sql when the database was first created.');
