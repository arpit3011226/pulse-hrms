-- Enhance announcements table with audience targeting and pinning
-- The table already exists from 00001_initial_schema.sql

-- Add audience targeting columns
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience_type TEXT NOT NULL DEFAULT 'all' CHECK (audience_type IN ('all', 'roles', 'departments'));
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience_roles TEXT[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience_department_ids UUID[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add created_by column (references profiles instead of old published_by which references employees)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Backfill created_by from published_by where possible
UPDATE announcements a
SET created_by = (SELECT profile_id FROM employees WHERE id = a.published_by)
WHERE a.published_by IS NOT NULL AND a.created_by IS NULL;

-- Make content NOT NULL with a default for existing rows
ALTER TABLE announcements ALTER COLUMN content SET DEFAULT '';
UPDATE announcements SET content = '' WHERE content IS NULL;

-- Add priority check constraint if not present
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_org_published ON announcements(organization_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(organization_id, is_pinned) WHERE is_pinned = true;
