-- Migration: 010_add_epic_sprint_to_issues.sql
-- Add epic_id and sprint_id columns to issues (nullable, ON DELETE SET NULL).

ALTER TABLE issues ADD COLUMN epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL;
ALTER TABLE issues ADD COLUMN sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_issues_epic_id ON issues(epic_id);
CREATE INDEX IF NOT EXISTS idx_issues_sprint_id ON issues(sprint_id);