const mysql = require('mysql2/promise');

// ─── Connection Pool ───────────────────────────────────────────────────────────
// Credentials can be overridden via environment variables for production.
// Set DB_PASSWORD environment variable if your MySQL root password is different.
const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || 'masoom842155',  // ← change this if needed
  database:         process.env.DB_NAME     || 'job_portal',
  port:             process.env.DB_PORT     ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  timezone:         '+00:00'
});

// ─── Schema Init ──────────────────────────────────────────────────────────────
async function initDB() {
  try {
    // Create the database if it doesn't exist, then switch to it
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`job_portal\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await pool.query(`USE \`job_portal\``);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id     INT AUTO_INCREMENT PRIMARY KEY,
        name   VARCHAR(255) NOT NULL,
        sector VARCHAR(255),
        hq     VARCHAR(255),
        size   VARCHAR(50),
        about  TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        company     VARCHAR(255) NOT NULL,
        company_id  INT,
        location    VARCHAR(255),
        category    VARCHAR(255),
        type        VARCHAR(50),
        exp         VARCHAR(100),
        sal_min     DECIMAL(10,2) DEFAULT 0,
        sal_max     DECIMAL(10,2) DEFAULT 0,
        skills      TEXT,
        description TEXT,
        req         TEXT,
        benefits    TEXT,
        urgent      BOOLEAN DEFAULT FALSE,
        posted      DATE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS applications (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        job_id       INT,
        job_title    VARCHAR(255),
        company      VARCHAR(255),
        user_id      INT,
        name         VARCHAR(255),
        email        VARCHAR(255),
        phone        VARCHAR(50),
        link         VARCHAR(500),
        current_role VARCHAR(255),
        cover        TEXT,
        status       VARCHAR(50) DEFAULT 'Pending',
        date         DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id      INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        job_id  INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE CASCADE,
        UNIQUE KEY unique_save (user_id, job_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
async function seedData() {
  try {
    const [existing] = await pool.execute('SELECT COUNT(*) AS count FROM companies');
    if (existing[0].count > 0) return; // already seeded

    const companyData = [
      [1, 'Google India',  'Technology',  'Bangalore', '5000+',     'Google India drives innovation across Search, Cloud, and Android for the Indian market.'],
      [2, 'Infosys',       'Technology',  'Pune',      '5000+',     'Infosys is a global leader in next-generation digital services and consulting.'],
      [3, 'TCS',           'Technology',  'Mumbai',    '5000+',     'Tata Consultancy Services is a global IT services, consulting and business solutions organization.'],
      [4, 'HDFC Bank',     'Finance',     'Mumbai',    '5000+',     "HDFC Bank is India's largest private sector bank with best-in-class service."],
      [5, 'Flipkart',      'E-Commerce',  'Bangalore', '5000+',     "Flipkart is India's leading e-commerce marketplace."],
      [6, 'Zomato',        'Technology',  'Delhi NCR', '1000-5000', 'Zomato is a food delivery, restaurant discovery, and dining-out platform.'],
      [7, 'Wipro',         'Technology',  'Bangalore', '5000+',     'Wipro is a global information technology, consulting and business process services company.'],
      [8, 'Accenture',     'Consulting',  'Mumbai',    '5000+',     'Accenture is a global professional services company with capabilities in digital, cloud and security.'],
    ];

    for (const comp of companyData) {
      await pool.execute(
        'INSERT INTO companies (id, name, sector, hq, size, about) VALUES (?, ?, ?, ?, ?, ?)',
        comp
      );
    }

    const jobData = [
      [1,  'Senior React Developer',     'Google India', 1, 'Bangalore', 'Technology',     'Full-time',  'Senior (6-10 yrs)',  28, 40, 'React,TypeScript,GraphQL,Node.js',                  'Drive the development of cutting-edge web applications at Google India. You will architect scalable front-end systems, lead engineering discussions, and mentor junior engineers.',                         '6+ years of React experience. Strong TypeScript skills. Experience with large-scale applications. Excellent problem-solving skills.',       'Equity, Health Insurance, Gym Membership, Learning Budget, Free Meals',    1, '2024-12-10'],
      [2,  'Data Science Manager',        'Infosys',      2, 'Pune',      'Technology',     'Hybrid',     'Senior (6-10 yrs)',  22, 32, 'Python,Machine Learning,SQL,TensorFlow',             'Lead a team of data scientists delivering AI/ML solutions for enterprise clients. Define roadmap, ensure delivery excellence, and drive innovation.',                                                     '5+ years in data science. Strong leadership skills. Experience with Python, ML frameworks. Client-facing experience preferred.',            'Performance Bonus, Medical Coverage, Remote Work Options, Conference Budget', 0, '2024-12-08'],
      [3,  'Product Designer (UX/UI)',    'Flipkart',     5, 'Bangalore', 'Design',         'Full-time',  'Mid-level (3-6 yrs)', 15, 24, 'Figma,User Research,Prototyping,Design Systems',    'Shape the future of e-commerce UX at Flipkart. Create intuitive, delightful experiences for millions of users across web and mobile.',                                                                  '3+ years of UX/UI design experience. Expert Figma skills. Portfolio showcasing end-to-end design process. E-commerce experience a plus.', 'ESOPs, Health Insurance, Flexible Hours, Design Conference Passes',       0, '2024-12-09'],
      [4,  'Investment Banking Analyst',  'HDFC Bank',    4, 'Mumbai',    'Finance',        'Full-time',  'Junior (1-3 yrs)',   10, 18, 'Financial Modeling,Excel,Bloomberg,Valuation',       "Join HDFC Bank's investment banking division. Work on IPOs, M&A advisory, and capital markets transactions for leading Indian corporates.",                                                               'MBA Finance or CA. Strong financial modeling skills. Attention to detail. Ability to work under pressure. CFA a plus.',                    'Annual Bonus, Medical & Life Insurance, Training Programs',               1, '2024-12-07'],
      [5,  'Backend Engineer – Node.js',  'Zomato',       6, 'Delhi NCR', 'Technology',     'Hybrid',     'Mid-level (3-6 yrs)', 18, 28, 'Node.js,MongoDB,Redis,Microservices',               'Build the technology that powers food delivery for millions. Work on high-throughput APIs, real-time systems, and distributed architectures.',                                                            '3+ years backend development. Strong Node.js expertise. Experience with microservices. Familiarity with cloud platforms (AWS/GCP).',      'Free Zomato Pro, ESOPs, Health Insurance, Flexible Work',                 0, '2024-12-11'],
      [6,  'HR Business Partner',         'Wipro',        7, 'Bangalore', 'Human Resources','Full-time',  'Mid-level (3-6 yrs)', 12, 18, 'HR Strategy,Talent Management,Employee Relations,HR Analytics', "Partner with business leaders to drive organizational effectiveness, talent strategies, and cultural initiatives across Wipro's engineering division.",                                              '4+ years HRBP experience. MBA HR preferred. Strong communication and influencing skills. Data-driven approach to HR.',                    'Annual Bonus, PF, Gratuity, Health Insurance, Learning Platforms',        0, '2024-12-06'],
      [7,  'Cloud Solutions Architect',   'TCS',          3, 'Mumbai',    'Technology',     'Full-time',  'Lead (10+ yrs)',     35, 50, 'AWS,Azure,Kubernetes,Terraform,Architecture',        "Lead cloud transformation engagements for Fortune 500 clients. Design enterprise-grade cloud architectures, define best practices, and drive adoption.",                                                  '10+ years IT experience, 5+ in cloud architecture. AWS/Azure certifications preferred. Excellent stakeholder management.',                 'Performance Bonus, ESOPs, International Exposure, Premium Health Coverage', 1, '2024-12-05'],
      [8,  'Digital Marketing Manager',   'Flipkart',     5, 'Bangalore', 'Marketing',      'Full-time',  'Mid-level (3-6 yrs)', 14, 22, 'SEO,SEM,Analytics,Content Strategy,Meta Ads',      "Own and execute Flipkart's digital marketing strategy across performance and brand channels. Drive customer acquisition and improve ROI.",                                                                 '4+ years digital marketing experience. Strong analytical skills. Experience with Google Ads, Meta Ads. E-commerce background preferred.',  'Health Insurance, Flexible Hours, Learning Budget, Performance Bonus',    0, '2024-12-03'],
      [9,  'Cybersecurity Analyst',       'Accenture',    8, 'Mumbai',    'Technology',     'Hybrid',     'Junior (1-3 yrs)',    8, 14, 'SIEM,Penetration Testing,Network Security,OWASP',   "Join Accenture's Cyber Defense Center and protect clients from evolving threats. Analyze security incidents, conduct threat hunting, and improve security posture.",                                       '1-3 years in cybersecurity. CEH or CompTIA Security+ preferred. Knowledge of SIEM tools. Good analytical skills.',                        'Certification Support, Health Insurance, Global Exposure',                0, '2024-12-04'],
      [10, 'Full Stack Developer Intern', 'Zomato',       6, 'Remote',    'Technology',     'Internship', 'Fresher (0-1 yr)',  0.5, 0.8, 'React,Node.js,MongoDB,REST APIs',                  "A 6-month paid internship to work on real Zomato products with senior engineers. You'll ship code to production and get deep mentorship.",                                                                'Final year student or recent graduate. Solid fundamentals in web development. Knowledge of React and Node.js. Strong problem-solving.',    'Competitive Stipend, Pre-Placement Offer (PPO), Mentorship, Work from Anywhere', 0, '2024-12-12'],
      [11, 'Business Analyst',            'Accenture',    8, 'Pune',      'Operations',     'Full-time',  'Junior (1-3 yrs)',    9, 15, 'JIRA,SQL,Process Modeling,Stakeholder Management',  'Bridge business and technology at Accenture. Gather requirements, map processes, and drive delivery of IT solutions for global clients.',                                                                    '1-3 years experience. MBA or Engineering degree. Experience with process documentation and SQL. Good communication skills.',               'Annual Bonus, Health Coverage, Global Mobility Opportunities',             0, '2024-12-01'],
      [12, 'iOS Developer',               'Google India', 1, 'Bangalore', 'Technology',     'Full-time',  'Mid-level (3-6 yrs)', 20, 35, 'Swift,Xcode,SwiftUI,CoreData,Firebase',             "Build world-class iOS experiences for Google's suite of apps. Collaborate with cross-functional teams to deliver polished, performant apps to millions.",                                                 '3+ years iOS development. Strong Swift skills. Published apps on the App Store. Knowledge of design principles and Apple HIG.',            'Equity, Premium Health Coverage, Device Budget, Learning Credits',         0, '2024-12-02'],
    ];

    for (const job of jobData) {
      await pool.execute(
        `INSERT INTO jobs (id, title, company, company_id, location, category, type, exp, sal_min, sal_max, skills, description, req, benefits, urgent, posted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        job
      );
    }

    console.log('✓ Seed data inserted (8 companies, 12 jobs)');
  } catch (err) {
    console.error('Error seeding data:', err.message);
    // Don't re-throw — seed failure is non-fatal if schema already exists
  }
}

module.exports = { pool, initDB, seedData };