import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db.js';

export const router = Router();

router.get('/students', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM students ORDER BY created_at DESC LIMIT 100');
  res.json(rows);
});

router.post('/students', async (req, res) => {
  const body = z.object({ name: z.string().min(1), gender: z.string().optional() }).parse(req.body);
  const { rows } = await pool.query(
    'INSERT INTO students(name, gender) VALUES ($1, $2) RETURNING *',
    [body.name, body.gender ?? null]
  );
  res.status(201).json(rows[0]);
});

// Subjects
router.get('/subjects', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM subjects ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/subjects', async (req, res) => {
  const body = z.object({ name: z.string().min(1), color: z.string().optional() }).parse(req.body);
  const { rows } = await pool.query(
    'INSERT INTO subjects(name, color) VALUES ($1, $2) RETURNING *',
    [body.name, body.color ?? null]
  );
  res.status(201).json(rows[0]);
});

// Enrollments (student-subject mapping)
router.post('/enrollments', async (req, res) => {
  const body = z.object({ studentId: z.string().uuid(), subjectId: z.string().uuid() }).parse(req.body);
  const { rows } = await pool.query(
    'INSERT INTO enrollments(student_id, subject_id) VALUES ($1, $2) ON CONFLICT (student_id, subject_id) DO NOTHING RETURNING *',
    [body.studentId, body.subjectId]
  );
  res.status(rows[0] ? 201 : 200).json(rows[0] ?? { ok: true });
});

router.get('/enrollments/:studentId', async (req, res) => {
  const params = z.object({ studentId: z.string().uuid() }).parse(req.params);
  const { rows } = await pool.query(
    `select e.id, e.student_id, e.subject_id, s.name as subject_name, s.color as subject_color
     from enrollments e join subjects s on s.id = e.subject_id
     where e.student_id = $1 order by s.name`,
    [params.studentId]
  );
  res.json(rows);
});

// Sessions (weekly recurring time blocks per enrollment)
router.get('/sessions/:studentId', async (req, res) => {
  const params = z.object({ studentId: z.string().uuid() }).parse(req.params);
  const { rows } = await pool.query(
    `select se.*, e.student_id, e.subject_id, su.name as subject_name, su.color as subject_color
     from sessions se
     join enrollments e on e.id = se.enrollment_id
     join subjects su on su.id = e.subject_id
     where e.student_id = $1
     order by se.weekday, se.starts_at`,
    [params.studentId]
  );
  res.json(rows);
});

router.post('/sessions', async (req, res) => {
  const body = z
    .object({
      enrollmentId: z.string().uuid(),
      weekday: z.number().int().min(0).max(6),
      startsAt: z.string(),
      endsAt: z.string(),
      room: z.string().optional(),
    })
    .parse(req.body);

  // overlap check: deny insert if overlaps with existing for same student
  const overlapSql = `
    select 1
    from sessions s
    join enrollments e on e.id = s.enrollment_id
    where e.id in (select id from enrollments where id = $1 or (student_id = (select student_id from enrollments where id = $1)))
      and s.weekday = $2
      and $3::time < s.ends_at and s.starts_at < $4::time
    limit 1`;
  const overlap = await pool.query(overlapSql, [body.enrollmentId, body.weekday, body.startsAt, body.endsAt]);
  if (overlap.rowCount && overlap.rows.length > 0) {
    return res.status(409).json({ message: '시간이 겹칩니다.' });
  }

  const { rows } = await pool.query(
    'insert into sessions(enrollment_id, weekday, starts_at, ends_at, room) values ($1, $2, $3::time, $4::time, $5) returning *',
    [body.enrollmentId, body.weekday, body.startsAt, body.endsAt, body.room ?? null]
  );
  res.status(201).json(rows[0]);
});


