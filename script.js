/* ============================================
   CareerNest – Full Featured JavaScript
   ============================================ */

/* ========== API LAYER ========== */
const API = {
  async _handle(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  },
  get: (url) => fetch(url).then(r => API._handle(r)),
  post: (url, d) => fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(d) }).then(r => API._handle(r)),
  put: (url, d) => fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(d) }).then(r => API._handle(r)),
  delete: (url) => fetch(url, { method: 'DELETE' }).then(r => API._handle(r))
};

/* ========== SESSION ========== */
const Session = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => localStorage.removeItem(k)
};

/* ========== CONSTANTS ========== */
const COLORS = [
  { bg: 'rgba(108,99,255,0.18)', fg: '#6C63FF' },
  { bg: 'rgba(78,205,196,0.18)', fg: '#4ECDC4' },
  { bg: 'rgba(201,168,76,0.18)', fg: '#C9A84C' },
  { bg: 'rgba(255,107,107,0.18)', fg: '#FF6B6B' },
  { bg: 'rgba(100,200,120,0.18)', fg: '#64C878' },
  { bg: 'rgba(200,100,200,0.18)', fg: '#C864C8' },
  { bg: 'rgba(100,150,255,0.18)', fg: '#6496FF' },
  { bg: 'rgba(255,180,50,0.18)', fg: '#FFB432' },
];
function colorFor(i) { return COLORS[Math.abs(i) % COLORS.length]; }

/* ========== DATA NORMALIZERS ========== */
function getJobSkills(job) {
  if (!job) return [];
  if (Array.isArray(job.skills)) return job.skills.filter(Boolean);
  if (typeof job.skills === 'string') return job.skills.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function normalizeJob(job) {
  if (!job) return null;
  return {
    ...job,
    id: Number(job.id),
    companyId: Number(job.company_id ?? job.companyId ?? 1),
    salMin: parseFloat(job.sal_min ?? job.salMin ?? 0),
    salMax: parseFloat(job.sal_max ?? job.salMax ?? 0),
    desc: job.description ?? job.desc ?? '',
    req: job.req ?? '',
    benefits: job.benefits ?? '',
    skills: getJobSkills(job),
    urgent: Boolean(job.urgent),
    posted: job.posted ?? new Date().toISOString().split('T')[0]
  };
}
function normalizeJobs(jobs) { return (jobs || []).map(normalizeJob); }

function normalizeApplication(app) {
  if (!app) return null;
  return {
    ...app,
    id: Number(app.id),
    jobId: Number(app.job_id ?? app.jobId),
    jobTitle: app.job_title ?? app.jobTitle ?? '',
    userId: Number(app.user_id ?? app.userId),
    current: app.current_role ?? app.current ?? ''
  };
}
function normalizeApplications(apps) { return (apps || []).map(normalizeApplication); }

/* ========== UTILITIES ========== */
function daysAgoLabel(dateStr) {
  if (!dateStr) return 'Recently';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff/7)}w ago`;
  return `${Math.floor(diff/30)}mo ago`;
}

function salaryLabel(min, max) {
  if (!min && !max) return 'Salary not disclosed';
  if (min < 1) return `₹${Math.round(min * 100)}k–${Math.round(max * 100)}k/mo`;
  return `₹${min}–${max} LPA`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

/* Debounce */
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
const debounceRenderJobsPage = debounce(() => renderJobsPage(), 350);

/* ========== NAVBAR ========== */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

function toggleMobileNav() {
  const links = document.getElementById('nav-links');
  const authArea = document.querySelector('.nav-auth-area');
  const overlay = document.getElementById('mobile-nav-overlay');
  const isOpen = links.classList.contains('mobile-open');
  links.classList.toggle('mobile-open', !isOpen);
  authArea.classList.toggle('mobile-open', !isOpen);
  overlay.classList.toggle('active', !isOpen);
}

function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

/* ========== NAVIGATION ========== */
let _currentPage = 'home';

async function showPage(page) {
  // Protected pages — require login
  if ((page === 'dashboard' || page === 'admin') && !Session.get('currentUser')) {
    toast('Please log in to access this page', 'error');
    page = 'login';
  }

  // Close mobile nav if open
  document.getElementById('nav-links')?.classList.remove('mobile-open');
  document.querySelector('.nav-auth-area')?.classList.remove('mobile-open');
  document.getElementById('mobile-nav-overlay')?.classList.remove('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) return;
  pageEl.classList.add('active');

  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  _currentPage = page;

  // Update admin breadcrumb
  const breadcrumbs = {
    home: 'Home', jobs: 'Find Jobs', companies: 'Companies',
    dashboard: 'My Dashboard', admin: 'Admin', login: 'Login', signup: 'Sign Up'
  };

  try {
    if (page === 'home') await renderHome();
    if (page === 'jobs') await renderJobsPage();
    if (page === 'companies') await renderCompanies();
    if (page === 'dashboard') await renderDashboard();
    if (page === 'admin') await renderAdmin();
  } catch(err) {
    console.error('Page render error:', err);
    toast('Failed to load page content. Please refresh.', 'error');
  }
}

/* ========== TOAST ========== */
let _toastTimer = null;
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  const iconEl = document.getElementById('toast-icon');
  if (!t || !msgEl || !iconEl) return;

  msgEl.textContent = msg;
  iconEl.textContent = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
  t.className = 'toast show ' + type;

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ========== JOB CARD ========== */
function jobCard(job, savedIds = []) {
  const c = colorFor((job.companyId || 1) - 1);
  const user = Session.get('currentUser');
  const saved = user && savedIds.includes(job.id);
  const sal = salaryLabel(job.salMin, job.salMax);
  const age = daysAgoLabel(job.posted);
  const companyInitial = (job.company || '?')[0].toUpperCase();
  const Skills = (job.skills || []).slice(0, 3);

  return `
  <div class="job-card fade-in" onclick="openJob(${job.id})" role="article" aria-label="${escapeHtml(job.title)} at ${escapeHtml(job.company)}">
    <div class="jc-header">
      <div class="jc-logo-wrap">
        <div class="jc-logo" style="background:${c.bg};color:${c.fg};">${companyInitial}</div>
        <div class="jc-info">
          <div class="jc-title">${escapeHtml(job.title)}</div>
          <div class="jc-company">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</div>
        </div>
      </div>
      <button class="jc-bookmark ${saved ? 'saved' : ''}"
        onclick="toggleSave(event,${job.id})"
        aria-label="${saved ? 'Remove from saved' : 'Save job'}"
        title="${saved ? 'Unsave' : 'Save job'}">
        ${saved ? '★' : '☆'}
      </button>
    </div>
    <div class="jc-tags">
      <span class="tag gold">${escapeHtml(job.type || '')}</span>
      <span class="tag">${escapeHtml(job.category || '')}</span>
      <span class="tag">${escapeHtml(job.exp || '')}</span>
      ${Skills.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('')}
    </div>
    <div class="jc-footer">
      <div class="salary">${escapeHtml(sal)}</div>
      <div class="jc-meta">
        ${job.urgent ? '<span class="urgency">Urgent</span>' : ''}
        <span class="posted">${age}</span>
      </div>
    </div>
  </div>`;
}

/* ========== SAVE/UNSAVE ========== */
async function toggleSave(e, id) {
  e.stopPropagation();
  const user = Session.get('currentUser');
  if (!user) { toast('Please log in to save jobs', 'error'); showPage('login'); return; }
  try {
    const savedIds = await API.get(`/api/saved/${user.id}`);
    const btn = e.currentTarget;
    if (savedIds.includes(id)) {
      await API.delete(`/api/saved/${user.id}/${id}`);
      btn.textContent = '☆'; btn.classList.remove('saved');
      btn.setAttribute('aria-label', 'Save job');
      toast('Removed from saved jobs');
    } else {
      await API.post('/api/saved', { userId: user.id, jobId: id });
      btn.textContent = '★'; btn.classList.add('saved');
      btn.setAttribute('aria-label', 'Remove from saved');
      toast('Job saved! ★');
    }
  } catch(err) {
    toast('Could not update saved jobs', 'error');
  }
}

/* ========== HOME ========== */
let homeFilter = 'all';

async function filterHome(btn, cat) {
  homeFilter = cat;
  document.querySelectorAll('#home-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const user = Session.get('currentUser');
  const [jobs, savedIds] = await Promise.all([
    API.get('/api/jobs').then(normalizeJobs),
    user ? API.get(`/api/saved/${user.id}`) : Promise.resolve([])
  ]);
  renderFeaturedJobs(jobs, savedIds);
}

async function renderHome() {
  const user = Session.get('currentUser');
  const [jobs, companies, savedIds] = await Promise.all([
    API.get('/api/jobs').then(normalizeJobs),
    API.get('/api/companies'),
    user ? API.get(`/api/saved/${user.id}`) : Promise.resolve([])
  ]);

  const statJobs = document.getElementById('stat-jobs');
  const statComp = document.getElementById('stat-companies');
  if (statJobs) statJobs.textContent = jobs.length + '+';
  if (statComp) statComp.textContent = companies.length + '+';

  renderFeaturedJobs(jobs, savedIds);
  renderHomeCompanies(companies, jobs);
}

function renderFeaturedJobs(jobs, savedIds = []) {
  const el = document.getElementById('featured-jobs');
  if (!el) return;
  const filtered = homeFilter === 'all' ? jobs : jobs.filter(j => j.category === homeFilter);
  const display = filtered.slice(0, 6);
  el.innerHTML = display.length
    ? display.map(j => jobCard(j, savedIds)).join('')
    : '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-muted);">No jobs in this category yet.</div>';
}

function renderHomeCompanies(companies, jobs) {
  const el = document.getElementById('home-companies');
  if (!el) return;
  el.innerHTML = companies.slice(0, 8).map((c, i) => {
    const col = colorFor(i);
    const jobCount = jobs.filter(j => j.companyId === c.id).length;
    return `
    <div class="company-card" onclick="filterByCompany('${escapeHtml(c.name)}')" role="button" aria-label="${escapeHtml(c.name)}, ${jobCount} jobs">
      <div class="comp-logo" style="background:${col.bg};color:${col.fg};">${c.name[0]}</div>
      <div class="comp-name">${escapeHtml(c.name)}</div>
      <div class="comp-jobs">${jobCount} open position${jobCount !== 1 ? 's' : ''}</div>
      <span class="comp-sector" style="background:${col.bg};color:${col.fg};">${escapeHtml(c.sector || '')}</span>
    </div>`;
  }).join('');
}

function filterByCompany(name) {
  showPage('jobs');
  setTimeout(() => {
    const el = document.getElementById('jobs-search');
    if (el) { el.value = name; renderJobsPage(); }
  }, 80);
}

function quickSearch(q) {
  document.getElementById('hero-search-input').value = q;
  doHeroSearch();
}

async function doHeroSearch() {
  const q = (document.getElementById('hero-search-input')?.value || '').trim();
  const loc = document.getElementById('hero-search-loc')?.value || '';
  showPage('jobs');
  setTimeout(async () => {
    const search = document.getElementById('jobs-search');
    if (search) search.value = q;
    if (loc) {
      const locMap = { 'Pune': 'loc-pune', 'Mumbai': 'loc-mumbai', 'Bangalore': 'loc-blr', 'Delhi NCR': 'loc-delhi', 'Hyderabad': 'loc-hyd', 'Remote': 'loc-remote' };
      const id = locMap[loc];
      if (id) { const el = document.getElementById(id); if (el) el.checked = true; }
    }
    await renderJobsPage();
  }, 80);
}

/* ========== JOBS PAGE ========== */
async function renderJobsPage() {
  const user = Session.get('currentUser');
  const [allJobs, savedIds] = await Promise.all([
    API.get('/api/jobs').then(normalizeJobs),
    user ? API.get(`/api/saved/${user.id}`) : Promise.resolve([])
  ]);

  // Update total count
  const totalEl = document.getElementById('jobs-total-count');
  if (totalEl) totalEl.textContent = allJobs.length;

  const q = (document.getElementById('jobs-search')?.value || '').toLowerCase().trim();
  const typeMap = { 'ft-full':'Full-time', 'ft-part':'Part-time', 'ft-remote':'Remote', 'ft-hybrid':'Hybrid', 'ft-intern':'Internship' };
  const catMap = { 'cat-tech':'Technology', 'cat-fin':'Finance', 'cat-mkt':'Marketing', 'cat-des':'Design', 'cat-hr':'Human Resources', 'cat-health':'Healthcare', 'cat-ops':'Operations' };
  const locMap = { 'loc-pune':'Pune', 'loc-mumbai':'Mumbai', 'loc-blr':'Bangalore', 'loc-delhi':'Delhi NCR', 'loc-hyd':'Hyderabad', 'loc-remote':'Remote' };
  const expMap = { 'exp-fresh':'Fresher (0-1 yr)', 'exp-junior':'Junior (1-3 yrs)', 'exp-mid':'Mid-level (3-6 yrs)', 'exp-senior':'Senior (6-10 yrs)', 'exp-lead':'Lead (10+ yrs)' };

  const getChecked = (map) => Object.entries(map).filter(([id]) => document.getElementById(id)?.checked).map(([, v]) => v);
  const selTypes = getChecked(typeMap);
  const selCats = getChecked(catMap);
  const selLocs = getChecked(locMap);
  const selExps = getChecked(expMap);

  let filtered = allJobs.filter(j => {
    if (q && ![j.title, j.company, j.category, j.location, (j.skills || []).join(' ')].join(' ').toLowerCase().includes(q)) return false;
    if (selTypes.length && !selTypes.includes(j.type)) return false;
    if (selCats.length && !selCats.includes(j.category)) return false;
    if (selLocs.length && !selLocs.includes(j.location)) return false;
    if (selExps.length && !selExps.includes(j.exp)) return false;
    return true;
  });

  // Sort
  const sort = document.getElementById('jobs-sort-select')?.value || 'newest';
  if (sort === 'salary_high') filtered.sort((a, b) => (b.salMax || 0) - (a.salMax || 0));
  else if (sort === 'salary_low') filtered.sort((a, b) => (a.salMin || 0) - (b.salMin || 0));
  else filtered.sort((a, b) => new Date(b.posted) - new Date(a.posted));

  const countEl = document.getElementById('jobs-count');
  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${allJobs.length} job${filtered.length !== 1 ? 's' : ''}`;

  const listEl = document.getElementById('jobs-list');
  if (listEl) {
    listEl.innerHTML = filtered.length
      ? filtered.map(j => jobCard(j, savedIds)).join('')
      : `<div style="grid-column:1/-1;text-align:center;padding:80px 0;">
          <div style="font-size:48px;margin-bottom:16px;">🔍</div>
          <div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">No jobs found</div>
          <div style="color:var(--text-muted);font-size:14px;">Try adjusting your search or filters</div>
        </div>`;
  }
}

async function clearFilters() {
  document.querySelectorAll('.search-sidebar input[type="checkbox"]').forEach(el => el.checked = false);
  const search = document.getElementById('jobs-search');
  if (search) search.value = '';
  await renderJobsPage();
}

/* ========== COMPANIES PAGE ========== */
let _allCompanies = []; let _allJobsForCompanies = [];

async function renderCompanies() {
  const [companies, jobs] = await Promise.all([
    API.get('/api/companies'),
    API.get('/api/jobs').then(normalizeJobs)
  ]);
  _allCompanies = companies; _allJobsForCompanies = jobs;
  displayCompanies(companies, jobs);
}

function filterCompanies() {
  const q = (document.getElementById('companies-search')?.value || '').toLowerCase().trim();
  const filtered = q ? _allCompanies.filter(c => (c.name + ' ' + (c.sector || '')).toLowerCase().includes(q)) : _allCompanies;
  displayCompanies(filtered, _allJobsForCompanies);
}

function displayCompanies(companies, jobs) {
  const el = document.getElementById('all-companies');
  if (!el) return;
  el.innerHTML = companies.map((c, i) => {
    const col = colorFor(i);
    const jobCount = jobs.filter(j => j.companyId === c.id).length;
    const about = (c.about || '').length > 90 ? c.about.substring(0, 90) + '…' : (c.about || '');
    return `
    <div class="company-card fade-in" role="article">
      <div class="comp-logo" style="background:${col.bg};color:${col.fg};width:72px;height:72px;font-size:28px;">${c.name[0]}</div>
      <div class="comp-name">${escapeHtml(c.name)}</div>
      <span class="comp-sector" style="background:${col.bg};color:${col.fg};margin-bottom:10px;">${escapeHtml(c.sector || '')}</span>
      <div class="comp-about">${escapeHtml(about)}</div>
      <div class="comp-footer">${escapeHtml(c.hq || '')} · ${escapeHtml(c.size || '')} employees</div>
      <div class="comp-jobs" style="margin-top:8px;">${jobCount} open position${jobCount !== 1 ? 's' : ''}</div>
      ${jobCount > 0 ? `<button class="btn-view-jobs" onclick="filterByCompany('${escapeHtml(c.name)}')" aria-label="View jobs at ${escapeHtml(c.name)}">View Jobs →</button>` : ''}
    </div>`;
  }).join('') || '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);">No companies found.</div>';
}

/* ========== JOB MODAL ========== */
async function openJob(id) {
  const overlay = document.getElementById('job-modal');
  // Show loading state
  document.getElementById('modal-header').innerHTML = '<div style="width:100%;text-align:center;padding:20px;color:var(--text-muted);">Loading...</div>';
  document.getElementById('modal-body').innerHTML = '';
  document.getElementById('apply-form').innerHTML = '';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const job = normalizeJob(await API.get(`/api/jobs/${id}`));
    if (!job) { toast('Job not found', 'error'); closeModalDirect(); return; }

    const c = colorFor((job.companyId || 1) - 1);
    const sal = salaryLabel(job.salMin, job.salMax);
    const user = Session.get('currentUser');
    const hasApplied = user
      ? normalizeApplications(await API.get(`/api/applications/${user.id}`)).some(a => a.jobId === id)
      : false;

    document.getElementById('modal-header').innerHTML = `
      <div class="modal-logo" style="background:${c.bg};color:${c.fg};">${(job.company || '?')[0]}</div>
      <div class="modal-meta" style="flex:1;min-width:0;">
        <h2 id="modal-job-title">${escapeHtml(job.title)}</h2>
        <p>${escapeHtml(job.company)} · ${escapeHtml(job.location)}</p>
        <div class="modal-meta-row">
          <div class="meta-item">📍 <strong>${escapeHtml(job.location)}</strong></div>
          <div class="meta-item">💼 <strong>${escapeHtml(job.type)}</strong></div>
          <div class="meta-item">📊 <strong>${escapeHtml(job.exp)}</strong></div>
          <div class="meta-item">💰 <strong>${escapeHtml(sal)}</strong></div>
          ${job.urgent ? '<div class="meta-item"><span class="urgency">Urgent Hiring</span></div>' : ''}
        </div>
      </div>
      <button class="modal-close" onclick="closeModalDirect()" aria-label="Close">✕</button>`;

    const reqItems = (job.req || '').split(/[.\n]/).filter(s => s.trim().length > 2).map(r => `<li>${escapeHtml(r.trim())}</li>`).join('');
    const benefitItems = (job.benefits || '').split(',').filter(Boolean).map(b => `<li>${escapeHtml(b.trim())}</li>`).join('');

    document.getElementById('modal-body').innerHTML = `
      <div class="modal-section">
        <div class="jc-tags">${(job.skills || []).map(s => `<span class="tag gold">${escapeHtml(s)}</span>`).join('')}</div>
      </div>
      <div class="modal-section">
        <h3>About the Role</h3>
        <p>${escapeHtml(job.desc)}</p>
      </div>
      ${reqItems ? `<div class="modal-section"><h3>Requirements</h3><ul>${reqItems}</ul></div>` : ''}
      ${benefitItems ? `<div class="modal-section"><h3>Benefits & Perks</h3><ul>${benefitItems}</ul></div>` : ''}`;

    if (hasApplied) {
      document.getElementById('apply-form').innerHTML = `
        <div style="text-align:center;padding:28px 0;">
          <div style="font-size:44px;margin-bottom:14px;">✅</div>
          <h3 style="font-size:18px;font-weight:700;color:var(--green);margin-bottom:8px;">Application Submitted!</h3>
          <p style="color:var(--text-muted);font-size:14px;">You've already applied for this position. We'll notify you of any updates.</p>
        </div>`;
    } else if (!user) {
      document.getElementById('apply-form').innerHTML = `
        <div style="text-align:center;padding:28px 0;">
          <div style="font-size:44px;margin-bottom:14px;">🔐</div>
          <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;">Sign in to Apply</h3>
          <p style="color:var(--text-muted);font-size:14px;margin-bottom:18px;">Create a free account or log in to apply for this position.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button class="btn-primary" onclick="closeModalDirect();showPage('login')">Sign In</button>
            <button class="btn-outline" onclick="closeModalDirect();showPage('signup')">Create Account</button>
          </div>
        </div>`;
    } else {
      document.getElementById('apply-form').innerHTML = `
        <h3>Apply for This Position</h3>
        <div class="form-row">
          <div class="form-group"><label for="app-name">Full Name *</label><input type="text" id="app-name" placeholder="Your full name" value="${escapeHtml(user.name || '')}"></div>
          <div class="form-group"><label for="app-email">Email *</label><input type="email" id="app-email" placeholder="your@email.com" value="${escapeHtml(user.email || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="app-phone">Phone Number</label><input type="tel" id="app-phone" placeholder="+91 XXXXX XXXXX"></div>
          <div class="form-group"><label for="app-link">LinkedIn / Portfolio URL</label><input type="url" id="app-link" placeholder="https://..."></div>
        </div>
        <div class="form-group"><label for="app-current">Current Role / Status</label><input type="text" id="app-current" placeholder="e.g. Software Engineer at ABC Corp, or Fresher"></div>
        <div class="form-group"><label for="app-cover">Cover Letter</label><textarea id="app-cover" placeholder="Tell the hiring team why you're the perfect fit for this role..."></textarea></div>
        <button class="btn-apply" onclick="applyJob(${job.id},'${escapeHtml(job.title).replace(/'/g,"\\'")}','${escapeHtml(job.company).replace(/'/g,"\\'")}')">Submit Application →</button>`;
    }
  } catch(err) {
    console.error('openJob error:', err);
    toast('Failed to load job details', 'error');
    closeModalDirect();
  }
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('job-modal')) return;
  closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('job-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}
// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModalDirect();
});

async function applyJob(id, title, company) {
  const user = Session.get('currentUser');
  if (!user) { toast('Please log in to apply', 'error'); showPage('login'); return; }

  const name = document.getElementById('app-name')?.value.trim();
  const email = document.getElementById('app-email')?.value.trim();
  if (!name || !email) { toast('Name and email are required', 'error'); return; }

  const btn = document.querySelector('.btn-apply');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    await API.post('/api/applications', {
      jobId: id, jobTitle: title, company,
      userId: user.id,
      name, email,
      phone: document.getElementById('app-phone')?.value || '',
      link: document.getElementById('app-link')?.value || '',
      current: document.getElementById('app-current')?.value || '',
      cover: document.getElementById('app-cover')?.value || ''
    });
    toast('Application submitted! 🎉 Good luck!');
    await openJob(id);
  } catch(err) {
    toast(err?.error || 'Failed to submit application', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Application →'; }
  }
}

/* ========== DASHBOARD ========== */
async function renderDashboard() {
  const user = Session.get('currentUser');
  if (!user) { showPage('login'); return; }

  const [apps, savedIds, jobs] = await Promise.all([
    API.get(`/api/applications/${user.id}`).then(normalizeApplications),
    API.get(`/api/saved/${user.id}`),
    API.get('/api/jobs').then(normalizeJobs)
  ]);
  const savedJobs = jobs.filter(j => savedIds.includes(j.id));

  const titleEl = document.getElementById('dash-title');
  if (titleEl) titleEl.textContent = `${user.name}'s Dashboard`;

  const statsEl = document.getElementById('dash-stats');
  if (statsEl) {
    const pending = apps.filter(a => a.status === 'Pending').length;
    const reviewed = apps.filter(a => a.status === 'Reviewed').length;
    const rejected = apps.filter(a => a.status === 'Rejected').length;
    statsEl.innerHTML = `
      <div class="dash-stat"><div class="num">${apps.length}</div><div class="lbl">Total Applications</div></div>
      <div class="dash-stat"><div class="num">${pending}</div><div class="lbl">Pending Review</div></div>
      <div class="dash-stat"><div class="num">${reviewed}</div><div class="lbl">Under Review</div></div>
      <div class="dash-stat"><div class="num">${savedJobs.length}</div><div class="lbl">Saved Jobs</div></div>`;
  }

  const tbody = document.getElementById('applications-body');
  if (tbody) {
    tbody.innerHTML = apps.length
      ? [...apps].reverse().map(a => `
        <tr>
          <td style="font-weight:600;">${escapeHtml(a.jobTitle)}</td>
          <td style="color:var(--text-muted);">${escapeHtml(a.company)}</td>
          <td style="color:var(--text-muted);">${a.date || '—'}</td>
          <td><span class="status-badge status-${(a.status || 'pending').toLowerCase()}">${escapeHtml(a.status || 'Pending')}</span></td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:48px;color:var(--text-muted);">No applications yet. <a onclick="showPage(\'jobs\')" style="color:var(--gold);cursor:pointer;font-weight:600;">Browse Jobs →</a></td></tr>';
  }

  const savedEl = document.getElementById('saved-jobs-list');
  if (savedEl) {
    savedEl.innerHTML = savedJobs.length
      ? savedJobs.map(j => jobCard(j, savedIds)).join('')
      : '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-muted);">No saved jobs yet. <a onclick="showPage(\'jobs\')" style="color:var(--gold);cursor:pointer;font-weight:600;">Browse Jobs →</a></div>';
  }
}

function switchDashTab(btn, tab) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('dash-' + tab)?.classList.add('active');
}

/* ========== ADMIN ========== */
async function renderAdmin() {
  try {
    const companies = await API.get('/api/companies');
    const sel = document.getElementById('a-company');
    if (sel) sel.innerHTML = companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    await Promise.all([renderManageJobs(), renderAdminApps(), renderAnalytics()]);
  } catch(err) { console.error('Admin render error:', err); }
}

function switchAdmin(el, section) {
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById('admin-' + section)?.classList.add('active');
  const breadcrumb = document.getElementById('admin-breadcrumb');
  if (breadcrumb) {
    const labels = { 'post-job': 'Post New Job', 'manage-jobs': 'Manage Jobs', 'applications': 'All Applications', 'add-company': 'Add Company', 'analytics': 'Analytics' };
    breadcrumb.textContent = labels[section] || section;
  }
}

async function postJob() {
  const title = document.getElementById('a-title')?.value.trim();
  const companyId = parseInt(document.getElementById('a-company')?.value);
  const desc = document.getElementById('a-desc')?.value.trim();
  const salMin = parseFloat(document.getElementById('a-sal-min')?.value) || 0;
  const salMax = parseFloat(document.getElementById('a-sal-max')?.value) || 0;

  if (!title) { toast('Job title is required', 'error'); return; }
  if (!desc) { toast('Job description is required', 'error'); return; }
  if (salMax && salMin > salMax) { toast('Min salary cannot exceed max salary', 'error'); return; }

  const btn = document.getElementById('btn-post-job-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Posting…'; }

  try {
    const companies = await API.get('/api/companies');
    const comp = companies.find(c => c.id === companyId);
    await API.post('/api/admin/jobs', {
      title, companyId,
      company: comp?.name || 'Unknown',
      location: document.getElementById('a-location')?.value,
      category: document.getElementById('a-category')?.value,
      type: document.getElementById('a-type')?.value,
      exp: document.getElementById('a-exp')?.value,
      salMin, salMax,
      skills: (document.getElementById('a-skills')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      description: desc,
      req: document.getElementById('a-req')?.value || '',
      benefits: document.getElementById('a-benefits')?.value || '',
      urgent: document.getElementById('a-urgent')?.checked || false
    });
    toast('Job posted successfully! 🚀');
    // Reset form
    ['a-title','a-sal-min','a-sal-max','a-skills','a-desc','a-req','a-benefits'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const urgent = document.getElementById('a-urgent'); if (urgent) urgent.checked = false;
    await renderManageJobs();
    await renderAnalytics();
  } catch(err) {
    toast(err?.error || 'Failed to post job', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✓ Post Job Listing'; }
  }
}

async function renderManageJobs() {
  const jobs = await API.get('/api/jobs');
  const countEl = document.getElementById('manage-jobs-count');
  if (countEl) countEl.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
  const tbody = document.getElementById('manage-jobs-body');
  if (!tbody) return;
  tbody.innerHTML = jobs.length
    ? [...jobs].reverse().map(j => `
      <tr>
        <td style="font-weight:600;">${escapeHtml(j.title)}</td>
        <td style="color:var(--text-muted);">${escapeHtml(j.company)}</td>
        <td><span class="tag">${escapeHtml(j.category || '')}</span></td>
        <td style="color:var(--text-muted);">${j.posted || '—'}</td>
        <td><button class="btn-danger" onclick="deleteJob(${j.id})">Delete</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No jobs posted yet.</td></tr>';
}

async function deleteJob(id) {
  if (!confirm('Are you sure you want to delete this job listing? This will also remove all associated applications.')) return;
  try {
    await API.delete(`/api/admin/jobs/${id}`);
    toast('Job deleted successfully');
    await renderManageJobs();
    await renderAnalytics();
  } catch(err) {
    toast(err?.error || 'Failed to delete job', 'error');
  }
}

async function renderAdminApps() {
  const apps = normalizeApplications(await API.get('/api/admin/applications'));
  const countEl = document.getElementById('admin-apps-count');
  if (countEl) countEl.textContent = `${apps.length} application${apps.length !== 1 ? 's' : ''}`;
  const tbody = document.getElementById('admin-apps-body');
  if (!tbody) return;
  tbody.innerHTML = apps.length
    ? [...apps].reverse().map(a => `
      <tr>
        <td style="font-weight:600;">${escapeHtml(a.name || '')}</td>
        <td style="color:var(--text-muted);">${escapeHtml(a.email || '')}</td>
        <td>${escapeHtml(a.jobTitle || '')}</td>
        <td style="color:var(--text-muted);">${a.date || '—'}</td>
        <td><span class="status-badge status-${(a.status || 'pending').toLowerCase()}">${escapeHtml(a.status || 'Pending')}</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            ${a.status !== 'Reviewed' ? `<button class="btn-outline btn-sm" onclick="updateAppStatus(${a.id},'Reviewed')">Review</button>` : ''}
            ${a.status !== 'Rejected' ? `<button class="btn-danger" onclick="updateAppStatus(${a.id},'Rejected')">Reject</button>` : ''}
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No applications yet.</td></tr>';
}

async function updateAppStatus(id, status) {
  try {
    await API.put(`/api/admin/applications/${id}`, { status });
    await renderAdminApps();
    toast(`Application marked as ${status}`);
  } catch(err) { toast('Failed to update status', 'error'); }
}

async function addCompany() {
  const name = document.getElementById('c-name')?.value.trim();
  if (!name) { toast('Company name is required', 'error'); return; }

  const btn = document.getElementById('btn-add-company');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }

  try {
    await API.post('/api/admin/companies', {
      name,
      sector: document.getElementById('c-sector')?.value,
      hq: document.getElementById('c-hq')?.value || '',
      size: document.getElementById('c-size')?.value,
      about: document.getElementById('c-about')?.value || ''
    });
    toast('Company added successfully! 🏢');
    ['c-name','c-hq','c-about'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    await renderAdmin();
  } catch(err) {
    toast(err?.error || 'Failed to add company', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Add Company'; }
  }
}

async function renderAnalytics() {
  const [jobs, apps, companies] = await Promise.all([
    API.get('/api/jobs').then(normalizeJobs),
    API.get('/api/admin/applications').then(normalizeApplications),
    API.get('/api/companies')
  ]);

  const statsEl = document.getElementById('admin-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="dash-stat"><div class="num">${jobs.length}</div><div class="lbl">Total Jobs</div></div>
      <div class="dash-stat"><div class="num">${apps.length}</div><div class="lbl">Applications</div></div>
      <div class="dash-stat"><div class="num">${companies.length}</div><div class="lbl">Companies</div></div>
      <div class="dash-stat"><div class="num">${apps.filter(a => a.status === 'Reviewed').length}</div><div class="lbl">Reviewed</div></div>`;
  }

  // Category bar chart
  const catData = {};
  jobs.forEach(j => { catData[j.category] = (catData[j.category] || 0) + 1; });
  const maxCat = Math.max(...Object.values(catData), 1);
  const catEl = document.getElementById('cat-bars');
  if (catEl) {
    catEl.innerHTML = Object.entries(catData).sort((a,b) => b[1]-a[1]).map(([cat, count]) => `
      <div class="bar-row">
        <div class="bar-label" title="${escapeHtml(cat)}">${escapeHtml(cat)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((count/maxCat)*100)}%"></div></div>
        <div class="bar-count">${count}</div>
      </div>`).join('') || '<div style="color:var(--text-muted);text-align:center;padding:20px;">No data yet</div>';
  }

  // Status bar chart
  const statusData = { Pending: 0, Reviewed: 0, Rejected: 0 };
  apps.forEach(a => { if (a.status in statusData) statusData[a.status]++; });
  const maxStat = Math.max(...Object.values(statusData), 1);
  const statusColors = { Pending: 'var(--gold)', Reviewed: 'var(--green)', Rejected: 'var(--accent2)' };
  const statEl = document.getElementById('status-bars');
  if (statEl) {
    statEl.innerHTML = Object.entries(statusData).map(([status, count]) => `
      <div class="bar-row">
        <div class="bar-label">${status}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((count/maxStat)*100)}%;background:${statusColors[status]}"></div></div>
        <div class="bar-count">${count}</div>
      </div>`).join('');
  }
}

/* ========== AUTH ========== */
async function signupUser() {
  const name = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  if (!name || !email || !password) { toast('All fields are required', 'error'); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  const btn = document.getElementById('btn-signup-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  try {
    await API.post('/api/auth/signup', { name, email, password });
    toast('Account created! Welcome to CareerNest 🎉');
    ['signup-name','signup-email','signup-password'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    showPage('login');
  } catch(err) {
    toast(err?.error || err?.message || 'Could not create account', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
}

async function loginUser() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  if (!email || !password) { toast('Please enter your email and password', 'error'); return; }

  const btn = document.getElementById('btn-login-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const user = await API.post('/api/auth/login', { email, password });
    Session.set('currentUser', user);
    updateNav();
    toast(`Welcome back, ${user.name}! 👋`);
    ['login-email','login-password'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    await showPage('dashboard');
  } catch(err) {
    toast(err?.error || 'Invalid email or password', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
}

function logout() {
  Session.remove('currentUser');
  updateNav();
  toast('Logged out. See you soon!');
  showPage('home');
}

function updateNav() {
  const user = Session.get('currentUser');
  const authDiv  = document.getElementById('nav-auth');
  const userDiv  = document.getElementById('nav-user');
  const userNameEl = document.getElementById('user-name');
  const avatarEl   = document.getElementById('user-avatar');
  const navAdmin   = document.getElementById('nav-admin');     // Admin nav link
  const btnPostJob = document.getElementById('btn-post-job');  // Post a Job button

  if (user) {
    // Logged in: show user info, hide login/signup buttons
    if (authDiv)    authDiv.style.display = 'none';
    if (userDiv)    userDiv.classList.add('visible');
    if (userNameEl) userNameEl.textContent = user.name;
    if (avatarEl)   avatarEl.textContent = (user.name || 'U')[0].toUpperCase();
    // Show Admin link and Post a Job button for logged-in users
    if (navAdmin)   navAdmin.style.display = '';
    if (btnPostJob) btnPostJob.style.display = '';
  } else {
    // Guest: show login/signup, hide user info
    if (authDiv)    authDiv.style.display = 'flex';
    if (userDiv)    userDiv.classList.remove('visible');
    // Hide Admin link and Post a Job button from guests
    if (navAdmin)   navAdmin.style.display = 'none';
    if (btnPostJob) btnPostJob.style.display = 'none';
  }
}

/* ========== INIT ========== */
window.addEventListener('DOMContentLoaded', async () => {
  updateNav();
  // Allow Enter key on hero search
  document.getElementById('hero-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doHeroSearch();
  });
  document.getElementById('jobs-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') renderJobsPage();
  });
  await showPage('home');
});