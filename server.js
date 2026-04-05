const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initDB, seedData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static files from the project root
app.use(express.static(path.join(__dirname)));

// Root → HTML app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'job_portal.html'));
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const handleError = (res, err) => {
  console.error('[API Error]', err.message || err);
  res.status(500).json({ error: err.message || 'Internal server error' });
};

// ─── JOBS ─────────────────────────────────────────────────────────────────────

// GET /api/jobs — list all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, title, company, company_id AS companyId, location, category, type, exp, sal_min AS salMin, sal_max AS salMax, skills, description AS `desc`, `req`, benefits, urgent, posted FROM jobs ORDER BY posted DESC, id DESC');
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// GET /api/jobs/:id — job detail
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, title, company, company_id AS companyId, location, category, type, exp, sal_min AS salMin, sal_max AS salMax, skills, description AS `desc`, `req`, benefits, urgent, posted FROM jobs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) { handleError(res, err); }
});

// ─── COMPANIES ────────────────────────────────────────────────────────────────

// GET /api/companies
app.get('/api/companies', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM companies ORDER BY name');
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) return res.status(400).json({ error: 'An account with this email already exists' });

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), password]
    );
    res.status(201).json({ id: result.insertId, name: name.trim(), email: email.trim().toLowerCase() });
  } catch (err) { handleError(res, err); }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const [rows] = await pool.execute(
      'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
      [email.trim().toLowerCase(), password]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    res.json(rows[0]);
  } catch (err) { handleError(res, err); }
});

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

// GET /api/applications/:userId — user's applications
app.get('/api/applications/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, job_id AS jobId, job_title AS jobTitle, company, user_id AS userId, name, email, phone, link, current_role AS `current`, cover, status, date FROM applications WHERE user_id = ? ORDER BY date DESC, id DESC', [req.params.userId]);
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// POST /api/applications — submit application
app.post('/api/applications', async (req, res) => {
  try {
    const { jobId, jobTitle, company, userId, name, email, phone, link, current, cover } = req.body;
    if (!jobId || !userId || !name || !email) {
      return res.status(400).json({ error: 'jobId, userId, name, and email are required' });
    }

    // Prevent duplicate applications
    const [dupe] = await pool.execute(
      'SELECT id FROM applications WHERE job_id = ? AND user_id = ?',
      [jobId, userId]
    );
    if (dupe.length > 0) return res.status(400).json({ error: 'You have already applied for this job' });

    const [result] = await pool.execute(
      `INSERT INTO applications (job_id, job_title, company, user_id, name, email, phone, link, current_role, cover, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [jobId, jobTitle, company, userId, name, email, phone || '', link || '', current || '', cover || '']
    );
    res.status(201).json({ id: result.insertId, message: 'Application submitted successfully' });
  } catch (err) { handleError(res, err); }
});

// ─── SAVED JOBS ───────────────────────────────────────────────────────────────

// GET /api/saved/:userId — get saved job IDs
app.get('/api/saved/:userId', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT job_id FROM saved_jobs WHERE user_id = ?', [req.params.userId]);
    res.json(rows.map(r => r.job_id));
  } catch (err) { handleError(res, err); }
});

// POST /api/saved — save a job
app.post('/api/saved', async (req, res) => {
  try {
    const { userId, jobId } = req.body;
    if (!userId || !jobId) return res.status(400).json({ error: 'userId and jobId are required' });
    await pool.execute('INSERT IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)', [userId, jobId]);
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// DELETE /api/saved/:userId/:jobId — unsave a job
app.delete('/api/saved/:userId/:jobId', async (req, res) => {
  try {
    await pool.execute('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?', [req.params.userId, req.params.jobId]);
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────

// GET /api/admin/applications — all applications
app.get('/api/admin/applications', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, job_id AS jobId, job_title AS jobTitle, company, user_id AS userId, name, email, phone, link, current_role AS `current`, cover, status, date FROM applications ORDER BY date DESC, id DESC');
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// PUT /api/admin/applications/:id — update application status
app.put('/api/admin/applications/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Reviewed', 'Rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });

    const [result] = await pool.execute('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Application not found' });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// POST /api/admin/jobs — post a new job
app.post('/api/admin/jobs', async (req, res) => {
  try {
    const { title, company, companyId, location, category, type, exp, salMin, salMax, skills, description, benefits, urgent } = req.body;
    const requirements = req.body.req || '';  // 'req' field from body
    if (!title?.trim() || !description?.trim()) return res.status(400).json({ error: 'Title and description are required' });

    const skillsValue = Array.isArray(skills) ? skills.join(',') : (skills || '');
    const [result] = await pool.execute('INSERT INTO jobs (title, company, company_id, location, category, type, exp, sal_min, sal_max, skills, description, `req`, benefits, urgent, posted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())', [title.trim(), company, companyId, location, category, type, exp, salMin || 0, salMax || 0, skillsValue, description.trim(), requirements, benefits || '', urgent ? 1 : 0]);
    res.status(201).json({ id: result.insertId });
  } catch (err) { handleError(res, err); }
});

// DELETE /api/admin/jobs/:id — delete a job and clean up
app.delete('/api/admin/jobs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // Clean up related records first (FK constraints)
    await pool.execute('DELETE FROM saved_jobs WHERE job_id = ?', [id]);
    await pool.execute('DELETE FROM applications WHERE job_id = ?', [id]);
    const [result] = await pool.execute('DELETE FROM jobs WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// POST /api/admin/companies — add a company
app.post('/api/admin/companies', async (req, res) => {
  try {
    const { name, sector, hq, size, about } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Company name is required' });
    const [result] = await pool.execute(
      'INSERT INTO companies (name, sector, hq, size, about) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), sector || '', hq || '', size || '', about || '']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { handleError(res, err); }
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // For non-API routes, serve the SPA
  res.sendFile(path.join(__dirname, 'job_portal.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await initDB();
    await seedData();
    app.listen(PORT, () => {
      console.log(`\n🚀 CareerNest Server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();