-- Core entities
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

-- Enrollment: student takes subject (class)
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  unique (student_id, subject_id)
);

-- Sessions: scheduled lessons (weekly recurring by weekday + start/end time)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  room text,
  constraint session_time_check check (ends_at > starts_at)
);

-- Helper view to detect overlaps per student
create view if not exists v_student_session_overlaps as
select s1.enrollment_id as enrollment_a,
       s2.enrollment_id as enrollment_b,
       e1.student_id,
       s1.weekday,
       s1.starts_at as a_start,
       s1.ends_at as a_end,
       s2.starts_at as b_start,
       s2.ends_at as b_end
from sessions s1
join enrollments e1 on e1.id = s1.enrollment_id
join sessions s2 on s2.weekday = s1.weekday and s2.id <> s1.id
join enrollments e2 on e2.id = s2.enrollment_id and e2.student_id = e1.student_id
where s1.starts_at < s2.ends_at and s2.starts_at < s1.ends_at;


