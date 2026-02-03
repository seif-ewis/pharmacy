# MediCare: Advanced Pharmacy Management Ecosystem

MediCare is a state-of-the-art, full-stack pharmacy management platform designed to bridge the gap between patients, healthcare providers (doctors/pharmacists), and administrators. It combines traditional e-commerce with clinical rigor, featuring AI-assisted prescription analysis, real-time inventory synchronization, and comprehensive audit logging.

---

## � User Roles & Core Features

### 🛒 Patient / Customer
- **Smart Catalog**: Browse medicines by category with real-time stock status.
- **AI-Enhanced Product Info**: View AI-generated details, benefits, and side effects for medicines.
- **Secure Checkout**: Guest and registered checkout flows with dynamic tax and delivery calculation.
- **Prescription Upload**: Securely upload handwritten or digital prescriptions for doctor review.
- **Real-time Support**: Integrated chat system to communicate directly with on-duty pharmacists.
- **Order Tracking**: Comprehensive history with real-time status updates (Processing → Shipped → Delivered).
- **Stock Subscriptions**: Receive notifications when out-of-stock items become available.

### ⚕️ Doctor / Pharmacist
- **Unified Dashboard**: Real-time overview of active shifts, pending prescriptions, and live order feeds.
- **AI Vision Analysis**: Automatic extraction of medications from uploaded prescription images using Google Gemini.
- **Shift Management**: Track performance-ledgers, cash flows, and sales data within specific work shifts.
- **Inventory Control**: Comprehensive CRUD for medicines with automated adjustment logging (Audit Trail).
- **Communication Hub**: Manage multiple active user chats and respond to product requests.
- **Returns Management**: Review and process return requests with reason validation.

### 🛡️ Administrator
- **Global Analytics**: Comprehensive view of system-wide revenue, user growth, and inventory health.
- **Staff Management**: Promote users to Doctor/Pharmacist roles and manage staff access.
- **Promotions & Coupons**: Create, manage, and toggle discount codes for marketing campaigns.
- **System Configuration**: Fine-tune global settings (tax rates, delivery fees, store status).
- **Audit Logs**: View mission-critical audit trails for Every security-sensitive action.
- **Broadcast Announcements**: Schedule and send notifications to all platform users.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js (v18+), Express.js (MVC Architecture) |
| **Frontend** | EJS (Templating), Vanilla JS, Tailwind CSS, Anime.js |
| **Database** | PostgreSQL (Relational Data), JSONB (AI Results) |
| **Real-time** | Socket.io (Bi-directional Chat & Live Stats) |
| **AI Engine** | Google Gemini (Image Analysis & Content Generation) |
| **Auth** | Passport.js (Local, Google OAuth 2.0), Bcrypt, Express-Session |
| **Storage** | Cloudinary (Image Hosting & Optimization) |

---

## 🏗️ Architecture & Database Schema

### System Design
The project follows a **Modified MVC Pattern**:
- **Models**: Handled via `pg-pool` with direct SQL queries for maximum performance control.
- **Controllers**: Logic separation for Auth, Admin, Doctor, Orders, and AI Services.
- **Middleware**: Role-based access control (RBAC), rate limiting, and global state injection.

### Key Table Relationships
- **Users (1:M) Orders**: Track customer purchasing history.
- **Users (1:M) Prescriptions**: Secure document association.
- **Medicines (1:M) Inventory_Adjustments**: Every stock change is linked to an adjustment record (audit trail).
- **Shifts (1:M) Orders/Adjustments**: Financial and operational accountability linked to a specific staff shift.
- **Orders (1:M) Order_Items (M:1) Medicines**: Relational product sales tracking.

---

## 🔐 Performance & Security Considerations

### Security (Audit-Ready)
- **Rate Limiting**: Protection against brute-force on Login and OTP endpoints.
- **CORS Configuration**: Restrictive origins to prevent cross-site request forgery.
- **Database Triggers**: Integrity checks (e.g., preventing stock changes on closed shifts).
- **Role-Based Security**: Strict `ensureAuthenticated`, `ensureDoctor`, and `ensureAdmin` middleware.
- **Data Privacy**: Passwords hashed using Bcrypt (10 rounds); PII handled with care.

### Performance (Scale-Ready)
- **Database Indexing**: Optimized B-Tree indexes for `email`, `id`, and foreign keys.
- **Connection Pooling**: `pg.Pool` utilized for efficient database connection reuse.
- **Asset Optimization**: Cloudinary transformation for images; Tailwind JIT for minimal CSS.
- **Asynchronous Logic**: AI and Email tasks are performed non-blockingly to maintain high UI responsiveness.

---

## � Setup & Installation

### 1. Prerequisites
- Node.js installed.
- PostgreSQL database instance.
- Cloudinary Account & Google Cloud (Gemini) API Key.

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3001
PG_USER=your_user
PG_PASSWORD=your_password
PG_DATABASE=hosam_pharmacy
PG_HOST=localhost
PG_PORT=5432

SESSION_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_key

CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
CALLBACK_URL=http://localhost:3001/auth/google/secrets
```

### 3. Database Initialization
Run the migration scripts found in the `scripts/` folder in order:
```bash
node scripts/setup_monitoring.js
node scripts/migrate_inventory.js
# ... and other scripts
```

### 4. Running Locally
```bash
npm install
npm start # Starts via nodemon
```

---

## 🛠️ Optimization Recommendations (Roadmap)
For a detailed technical guide on scaling, database indexing, and security hardening, see our [Optimization Roadmap](file:///b:/future/hosam%20pharmacy/OPTIMIZATION.md).

- [ ] **Redis Caching**: Cache product catalog and search results.
- [ ] **ElasticSearch**: Integrate for advanced medical term fuzzy searches.
- [ ] **Worker Threads**: Use BullMQ for high-volume email and AI processing.
- [ ] **CDN**: Deliver static assets via Cloudfront or Cloudflare.

---

## ❓ Missing Info Needed
- **SMTP Configuration**: Need valid credentials for the `emailService.js` to enable real OTP delivery (current state is mock-capable).
- **Deployment URL**: Need the production domain to finalize CORS and Google OAuth callback security.
- **Backup Policy**: Confirm if WAL-G or simple pg_dump backups are preferred for the DB.
- **Payment Gateway**: Confirm if Stripe/PayPal is planned for real transactions (currently manual/placeholder flow).
