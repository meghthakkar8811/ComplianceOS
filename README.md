# ComplianceOS — PHP + MySQL + HTML/CSS
## Mining Statutory Compliance Platform

---

## What Is This

A complete, production-ready web application for Indian mining companies to automate:
- IBM Form B auto-fill (Monthly Production Return)
- Royalty calculation with DMF + NMET (8 states, 8 minerals)
- DGMS Inspection Readiness Score
- Compliance Calendar with auto-generated deadlines
- Document repository with expiry tracking
- Email + OTP verification
- Google Sign-In

**Stack:** HTML + CSS + Vanilla JS (frontend) · PHP 8.1+ (backend) · MySQL 8 (database)

---

## Setup in 5 Steps

### Step 1 — Requirements
- PHP 8.1 or higher
- MySQL 8.0 or higher
- A web server: Apache (XAMPP/WAMP/LAMP) or PHP built-in server

Check your PHP version:
```
php --version
```

### Step 2 — Create the Database

Open MySQL and run the schema file:
```sql
mysql -u root -p < database/schema.sql
```

Or in phpMyAdmin:
1. Create a new database called `complianceos`
2. Import `database/schema.sql`

This creates all tables and seeds 64 royalty rates (8 states × 8 minerals).

### Step 3 — Configure the Application

Copy the example config:
```
cp .env.example .env
```

Edit `.env` and set:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=complianceos
APP_URL=http://localhost:8000
APP_SECRET=make_this_a_long_random_string_64_chars
```

For Google Sign-In (optional but recommended):
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 Web credentials
5. Add redirect URI: `http://localhost:8000/backend/auth/google_callback.php`
6. Copy Client ID and Secret into `.env`

For Email verification (required for OTP):
- Gmail: Enable 2FA → Google Account → Security → App Passwords → Generate
- Set SMTP_USER and SMTP_PASS in `.env`

### Step 4 — Start the Server

**Option A — PHP Built-in Server (easiest, no Apache needed):**
```
cd /path/to/complianceos-php
php -S localhost:8000 router.php
```
Then open: http://localhost:8000

**Option B — XAMPP / WAMP:**
1. Copy the entire `complianceos-php` folder into `htdocs` (XAMPP) or `www` (WAMP)
2. Start Apache and MySQL
3. Open: http://localhost/complianceos-php/frontend/login.html

**Option C — Apache on Linux:**
```bash
sudo cp -r complianceos-php /var/www/html/complianceos
sudo chown -R www-data:www-data /var/www/html/complianceos
# Edit database.php with your credentials
# Open http://localhost/complianceos/frontend/login.html
```

### Step 5 — Create Your Account

1. Open `http://localhost:8000/frontend/signup.html`
2. Enter your company name, name, and email
3. Check your email for the 6-digit OTP
4. Enter the OTP on the verify page
5. Log in and add your first mine lease

---

## Project Structure

```
complianceos-php/
├── frontend/
│   ├── login.html          ← Sign in page
│   ├── signup.html         ← Create account page
│   ├── verify.html         ← OTP email verification
│   ├── forgot.html         ← Forgot password / reset
│   ├── dashboard.html      ← Main app (8 pages in one)
│   ├── css/
│   │   ├── auth.css        ← Login/signup styles
│   │   └── dashboard.css   ← Dashboard styles
│   └── js/
│       └── dashboard.js    ← All frontend logic
│
├── backend/
│   ├── config/
│   │   ├── database.php    ← DB connection, helpers, auth functions
│   │   └── env.php         ← .env file loader
│   ├── auth/
│   │   ├── login.php           ← Email/password login
│   │   ├── register.php        ← New account creation
│   │   ├── verify_email.php    ← OTP verification
│   │   ├── resend_code.php     ← Resend verification OTP
│   │   ├── forgot_password.php ← Request password reset
│   │   ├── reset_password.php  ← Complete password reset
│   │   ├── google_login.php    ← Google OAuth redirect
│   │   ├── google_callback.php ← Google OAuth callback
│   │   └── logout.php          ← Session/token destruction
│   └── api/
│       ├── mines.php       ← Mine CRUD + onboarding
│       └── core.php        ← Dashboard, production, royalty,
│                              compliance, DGMS endpoints
│
├── database/
│   └── schema.sql          ← Complete MySQL schema + seed data
│
├── .htaccess               ← Apache config (security + CORS)
├── router.php              ← PHP built-in server router
├── .env.example            ← Environment config template
└── README.md               ← This file
```

---

## Feature Pages

| Page | URL / Section | What It Does |
|------|-------------|--------------|
| Login | `/frontend/login.html` | Email + Google sign-in, remember me |
| Signup | `/frontend/signup.html` | Company registration, password strength meter |
| Verify | `/frontend/verify.html` | 6-digit OTP with auto-submit, resend cooldown |
| Forgot | `/frontend/forgot.html` | 2-step: request code → enter code + new password |
| Dashboard | `/frontend/dashboard.html` | Live health score, KPIs, chart, deadlines, royalty |
| Calendar | Dashboard → Calendar tab | All deadlines by authority, filterable |
| Royalty | Dashboard → Royalty tab | Live calculator with range slider, 8 states |
| IBM Forms | Dashboard → Forms tab | Form B auto-fill from production data |
| Production | Dashboard → Production tab | Daily entry, CSV export, verify entries |
| Documents | Dashboard → Documents tab | Upload, expiry tracking, category filter |
| DGMS | Dashboard → DGMS tab | 8-register readiness score, mark updated |
| Alerts | Dashboard → Alerts tab | Aggregated compliance alerts |

---

## API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/backend/auth/register.php` | No | Create tenant + user |
| POST | `/backend/auth/login.php` | No | Login, get session token |
| POST | `/backend/auth/verify_email.php` | No | Verify OTP |
| POST | `/backend/auth/resend_code.php` | No | Resend OTP |
| POST | `/backend/auth/forgot_password.php` | No | Request reset code |
| POST | `/backend/auth/reset_password.php` | No | Complete password reset |
| GET | `/backend/auth/google_login.php` | No | Google OAuth redirect |
| GET | `/backend/auth/google_callback.php` | No | Google OAuth callback |
| POST | `/backend/auth/logout.php` | Yes | Destroy session |
| GET | `/backend/api/mines.php` | Yes | List tenant mines |
| POST | `/backend/api/mines.php` | Yes | Create mine + auto-calendar |
| GET | `/backend/api/core.php?ep=dashboard&mine_id=X` | Yes | Full dashboard data |
| GET | `/backend/api/core.php?ep=production&mine_id=X&month=YYYY-MM` | Yes | Production entries |
| POST | `/backend/api/core.php?ep=production&mine_id=X` | Yes | Add production entry |
| GET | `/backend/api/core.php?ep=royalty_preview&state=X&mineral=Y&quantity_mt=Z` | Yes | Live royalty preview |
| GET | `/backend/api/core.php?ep=royalty_compare&mineral=X` | Yes | State rate comparison |
| GET | `/backend/api/core.php?ep=deadlines&mine_id=X` | Yes | Compliance deadlines |
| GET | `/backend/api/core.php?ep=dgms&mine_id=X` | Yes | DGMS readiness score |
| POST | `/backend/api/core.php?ep=dgms&mine_id=X` | Yes | Mark register updated |

---

## Common Issues

**"No royalty rate found"**
Run `database/schema.sql` again — the Gujarat and other seed rows may be missing.

**"Email not sending"**
For Gmail, you need an App Password (not your regular password). Enable 2FA first.
Or set `SMTP_USER` and `SMTP_PASS` in `.env` and add this to `database.php`:
```php
// Quick test — log OTP to PHP error log instead of emailing
error_log("OTP for $email: $code");
```

**"Google Sign-In not working"**
Make sure the redirect URI in Google Console exactly matches `APP_URL/backend/auth/google_callback.php`.
For localhost, use `http://localhost:8000` not `http://127.0.0.1:8000`.

**CORS errors in browser console**
Make sure `.htaccess` is being read. Add `AllowOverride All` to your Apache VirtualHost.
With the PHP built-in server, CORS headers are set directly in each PHP file.

**Session not persisting**
Check that `session.cookie_httponly` is enabled in PHP and cookies are being set.
For the PHP built-in server, use the same hostname (`localhost`, not `127.0.0.1`).

---

## Production Deployment

1. Upload files to your hosting server (shared hosting, VPS, or cloud)
2. Set `APP_URL` to your real domain in `.env`
3. Enable HTTPS — update `.htaccess` to force HTTPS
4. Set `APP_SECRET` to a truly random 64-character string
5. Use a production SMTP service (SendGrid, Mailgun, Amazon SES)
6. Restrict database user permissions — app user should not have DROP TABLE access
7. Set up daily MySQL backup via cron

---

*ComplianceOS — Built for Indian Mining Companies*
*© 2026 Megh Thakkar / Thakkar Mining*
