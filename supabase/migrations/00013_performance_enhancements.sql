-- ============================================
-- Performance Management Enhancements
-- 360-Degree Reviews, OKR Goals, Skip Criteria
-- ============================================

-- ============================================
-- 1. New columns on existing tables
-- ============================================

-- Employee Goals: OKR cascading + assignment tracking
ALTER TABLE employee_goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES employee_goals(id) ON DELETE SET NULL;
ALTER TABLE employee_goals ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_parent ON employee_goals(parent_goal_id);

-- Performance Cycles: skip criteria + peer review deadline
ALTER TABLE performance_cycles ADD COLUMN IF NOT EXISTS skip_criteria JSONB DEFAULT '{}'::jsonb;
ALTER TABLE performance_cycles ADD COLUMN IF NOT EXISTS auto_apply_to_all BOOLEAN DEFAULT true;
ALTER TABLE performance_cycles ADD COLUMN IF NOT EXISTS peer_review_deadline DATE;

-- ============================================
-- 2. Peer Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS peer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  performance_review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  peer_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rating NUMERIC(3,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  strengths TEXT,
  areas_for_improvement TEXT,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(performance_review_id, peer_id)
);

CREATE INDEX idx_peer_reviews_review ON peer_reviews(performance_review_id);
CREATE INDEX idx_peer_reviews_peer ON peer_reviews(peer_id);

-- ============================================
-- 3. Skip-Level Reviews
-- ============================================
CREATE TABLE IF NOT EXISTS skip_level_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  performance_review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  skip_level_manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rating NUMERIC(3,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  strengths TEXT,
  areas_for_improvement TEXT,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(performance_review_id)
);

CREATE INDEX idx_skip_level_reviews_review ON skip_level_reviews(performance_review_id);

-- ============================================
-- 4. Review Participants (360 manifest)
-- ============================================
CREATE TABLE IF NOT EXISTS review_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  performance_review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('self', 'manager', 'peer', 'skip_level')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  is_mandatory BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(performance_review_id, reviewer_id, reviewer_type)
);

CREATE INDEX idx_review_participants_review ON review_participants(performance_review_id);
CREATE INDEX idx_review_participants_reviewer ON review_participants(reviewer_id, status);

-- ============================================
-- 5. RLS Policies
-- ============================================

-- Peer Reviews
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY peer_reviews_read ON peer_reviews FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM employees WHERE id = auth.uid())
);

CREATE POLICY peer_reviews_manage_own ON peer_reviews FOR ALL USING (
  peer_id = auth.uid()
);

CREATE POLICY peer_reviews_admin ON peer_reviews FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'hr_admin')
  )
);

-- Skip-Level Reviews
ALTER TABLE skip_level_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY skip_level_reviews_read ON skip_level_reviews FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM employees WHERE id = auth.uid())
);

CREATE POLICY skip_level_reviews_manage_own ON skip_level_reviews FOR ALL USING (
  skip_level_manager_id = auth.uid()
);

CREATE POLICY skip_level_reviews_admin ON skip_level_reviews FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'hr_admin')
  )
);

-- Review Participants
ALTER TABLE review_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_participants_read ON review_participants FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM employees WHERE id = auth.uid())
);

CREATE POLICY review_participants_admin ON review_participants FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'hr_admin', 'manager')
  )
);
