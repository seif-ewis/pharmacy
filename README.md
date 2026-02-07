# 💊 Hosam Pharmacy: Next-Gen Healthcare Ecosystem

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi--Relation-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Session--Caching-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

**Hosam Pharmacy** is a premium, feature-rich pharmacy management system that bridges the gap between traditional medicine sales and modern AI-driven clinical care. Designed for patients, doctors, and administrators, it offers a seamless experience from prescription analysis to inventory synchronization.

---

## 🌟 Core Ecosystem

### 🧪 Advanced Patient Experience
*   **Intelligent Catalog**: Real-time stock availability, infinite-scroll categories, and powerful search.
*   **AI-Assisted Clarity**: Automated generation of medicine benefits, side effects, and usage instructions.
*   **Clinical Submission**: Securely upload prescription images for review by licensed pharmacists.
*   **Real-time Guidance**: Live chat with on-duty doctors and pharmacists via Socket.io.
*   **Dynamic Cart**: Smart tax calculations, guest/member checkout, and multi-address management.

### ⚕️ The Doctor’s Workspace
*   **AI Vision Analysis**: Automatic extraction of medication details from handwritten prescriptions using Google Gemini.
*   **Shift Accountability**: Integrated shift management (Start/End) tracking performance, sales, and inventory changes.
*   **Inventory Master**: Comprehensive CRUD for medicines with AI-powered detail generation for new stock items.
*   **Manual Fulfillment**: Create orders directly from patient chats or walk-in consultations.
*   **Processing Engine**: Review returns, fulfill special product requests, and approve/reject prescriptions.

### 🛡️ Administrative Command Center
*   **Global Analytics**: Real-time dashboard for revenue, user trends, and inventory health.
*   **Audit Logging**: Detailed trail of every critical system action for security and compliance.
*   **Staff Governance**: Manage roles, promote doctors, and handle global configurations.
*   **Communication Hub**: Schedule and broadcast announcements to the entire user base.

---

## 🛠️ Technology Stack

| Category | Tech | Description |
| :--- | :--- | :--- |
| **Backend** | `Node.js` + `Express` | High-performance, modular MVC architecture. |
| **Frontend** | `EJS` + `Vanilla CSS` | SEO-optimized templates with premium dark/light themes. |
| **Database** | `PostgreSQL` | Relational storage for orders, users, and audit data. |
| **Caching** | `Redis` | Distributed session management and potential caching layer. |
| **Real-time** | `Socket.io` | Bi-directional communication for chat and notifications. |
| **AI Layer** | `Google Gemini` | Multimodal analysis (OCR/Medication recognition). |
| **Storage** | `Cloudinary` | Optimized image hosting for prescriptions and avatars. |

---

## 📂 Project Anatomy

```bash
├── public/                # Static assets (animations, CSS, JS)
├── src/
│   ├── config/            # DB, Redis, Passport, and Cloudinary setups
│   ├── controllers/       # Business logic (Modularized by role)
│   ├── middleware/        # RBAC, Rate limiting, Global state
│   ├── routes/            # Route definitions (admin, auth, user)
│   ├── services/          # External integrations (Email, etc.)
│   └── utils/             # Helper functions & event emitters
├── view/                  # EJS templates (doctor dashboard, admin panel, etc.)
├── scripts/               # DB Migrations and initialization utilities
└── server.js              # Application entry point & Socket.io logic
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Instance
- Redis Server
- API Keys for: Cloudinary, Google Gemini, and Google OAuth

### 2. Environment Setup
Create a `.env` file in the root:
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
CALLBACK_URL=http://localhost:3001/auth/google/callback
```

### 3. Initialize Database
Run the schema migrations:
```bash
node scripts/setup_monitoring.js
node scripts/migrate_inventory.js
# See scripts/ folder for full migration list
```

### 4. Launch
```bash
npm install
npm run dev # Starts server via nodemon
```

---

## 🔐 Security & Optimization
*   **Rate Limiting**: Per-route limits on sensitive actions (OTP, Profile updates, Orders).
*   **Secure Sessions**: Redis-backed sessions with HTTP-only, secure, and same-site cookies.
*   **RBAC**: Strict role-based access control (`ensureAdmin`, `ensureDoctor`).
*   **Audit trails**: Automated logging of stock adjustments and status changes.
*   **Asset Performance**: Cloudinary on-the-fly image transformations for fast loads.

---

## 🔮 Roadmap & Future Features
- [ ] **Advanced Search**: Fuzzy search integration with ElasticSearch.
- [ ] **Background Workers**: Moving AI tasks to BullMQ/Redis worker threads.
- [ ] **Payment Integration**: Stripe/PayPal live gateway implementation.
- [ ] **Mobile App**: React Native bridge for patient prescriptions.

---
*Created with ❤️ for Hosam Pharmacy Ecosystem.*
