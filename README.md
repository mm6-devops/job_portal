# CareerNest – Job Portal

A full-featured job portal web application built with **Node.js**, **Express**, and **MySQL**. Features a premium dark-mode UI with job listings, company profiles, user authentication, job applications, and an admin panel.

![CareerNest](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)

---

## ✨ Features

- 🔍 **Browse & Search Jobs** — Filter by type, category, location, and experience level
- 🏢 **Company Profiles** — Explore top hiring companies with open positions
- 🔐 **Authentication** — Sign up / Login / Logout with session management
- 📝 **Job Applications** — Apply to jobs with cover letter, track status from dashboard
- ★ **Save Jobs** — Bookmark jobs for later
- 📊 **User Dashboard** — View all applications and saved jobs in one place
- ⚙️ **Admin Panel** — Post jobs, manage listings, review applications, add companies, analytics (login required)
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Vanilla CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL 8.x |
| Fonts | Google Fonts (Playfair Display, DM Sans) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL](https://www.mysql.com/) 8.x running locally

### 1. Clone the repository

```bash
git clone https://github.com/mm6-devops/job_portal.git
cd job_portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your MySQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=job_portal
DB_PORT=3306
PORT=3000
```

### 4. Set up the database

The app **automatically creates** the `job_portal` database, all tables, and seeds sample data (8 companies + 12 jobs) on first run. No manual SQL setup needed.

### 5. Start the server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

Open your browser at **http://localhost:3000**

---

## 📁 Project Structure

```
job_portal/
├── job_portal.html   # Single-page app (all pages/components)
├── styles.css        # All styles — premium dark-mode design
├── script.js         # Frontend logic — API calls, rendering, routing
├── server.js         # Express REST API server
├── db.js             # MySQL connection pool, schema init & seed data
├── package.json
├── .env.example      # Environment variable template
└── .gitignore
```

---

## 🔑 Default Seed Data

On first run, the app seeds:

**Companies:** Google India, Infosys, TCS, HDFC Bank, Flipkart, Zomato, Wipro, Accenture

**Jobs:** 12 sample listings across Technology, Finance, Design, Marketing, HR, and Operations categories

> No default admin account exists. Simply **Sign Up** to create your account — all logged-in users can access the Admin panel.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get job by ID |
| GET | `/api/companies` | List all companies |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/applications/:userId` | User's applications |
| POST | `/api/applications` | Submit application |
| GET | `/api/saved/:userId` | User's saved job IDs |
| POST | `/api/saved` | Save a job |
| DELETE | `/api/saved/:userId/:jobId` | Unsave a job |
| GET | `/api/admin/applications` | All applications (admin) |
| PUT | `/api/admin/applications/:id` | Update app status (admin) |
| POST | `/api/admin/jobs` | Post a new job (admin) |
| DELETE | `/api/admin/jobs/:id` | Delete a job (admin) |
| POST | `/api/admin/companies` | Add a company (admin) |

---

## 📸 Pages

| Page | Description |
|---|---|
| **Home** | Hero section, featured jobs, company strip, how-it-works |
| **Find Jobs** | Full job listings with sidebar filters and sort |
| **Companies** | All companies with search |
| **My Dashboard** | Applications table + saved jobs (login required) |
| **Admin Panel** | Post jobs, manage listings, view all apps, analytics (login required) |
| **Login / Sign Up** | Auth forms |

---

## 📝 License

MIT — feel free to use this project for learning or personal use.

---

> Built with ❤️ — CareerNest, India's Premier Job Portal
