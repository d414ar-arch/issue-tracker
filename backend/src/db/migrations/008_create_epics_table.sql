-- Migration: 008_create_epics_table.sql
-- Create epics table for long-lived scope groupings.

CREATE TABLE IF NOT EXISTS epics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_epics_name ON epics(name);