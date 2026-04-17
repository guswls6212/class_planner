CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id, date)
);

CREATE INDEX idx_attendance_academy ON attendance(academy_id);
CREATE INDEX idx_attendance_session_date ON attendance(session_id, date);
CREATE INDEX idx_attendance_student ON attendance(student_id, date);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- service_role key로만 접근 (API 라우트에서 처리)
