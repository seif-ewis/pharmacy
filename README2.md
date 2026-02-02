# Project Technical Specifications & FAQ (README 2)

This document provides detailed answers to architectural and implementation questions regarding the MediCare Pharmacy platform.

---

### 1. Authentication & Authorization
- **Methods**: Both **Email/Password** and **OAuth (Google)** are implemented.
- **Session Management**: Handled via `express-session`. In the current development state, sessions are stored in-memory, which should be migrated to a store like Redis for production.
- **Role Enforcement**: Roles (`patient`, `doctor`, `admin`) are strictly enforced via middleware (`ensureAuthenticated`, `ensureDoctor`, `ensureAdmin`) across all protected routes.

### 2. Database & Queries
- **Expected Concurrency**: The current architecture (Node.js + pg-pool) is capable of handling hundreds of concurrent users. For thousands of orders per second, vertical scaling or a message queue would be required.
- **Heavy Queries**: Dashboard analytics and global search (using `ILIKE`) are the most resource-intensive. 
- **Indexing**: Basic B-Tree indexes for `email`, `id`, and some foreign keys are in place. Advanced indexing (e.g., GIN for search) is an optimization recommendation.
- **Transactions**: While migration scripts use transactions, current controllers perform atomic queries. Implementing multi-query transactions for Order creation is a planned optimization.

### 3. Caching & Real-time
- **Caching**: No Redis integration is currently active. Caching is a primary recommendation for production.
- **Real-time**: Implemented via **Socket.io**. It handles live chat and dashboard stat updates. Scaling would require a Redis emitter/adapter.

### 4. Static Assets & Frontend
- **Media**: Images (Medicine photos, avatars, prescriptions) are hosted on **Cloudinary**, which provides an optimization layer.
- **Tailwind CSS**: Running in standard JIT mode.
- **JS Performance**: Scripts include debouncing for search inputs and use Socket.io for lightweight live updates.

### 5. Email / OTP / Verification
- **Delivery**: Uses `nodemailer`. It currently supports real SMTP (Gmail/Outlook) or developer mocks.
- **Verification**: OTP verification is fully implemented for **Signups** and **Password Resets**.
- **Failed Deliveries**: Errors are currently logged to the server console; a retry-log table is recommended for production.

### 6. Security
- **Rate Limiting**: Implemented for Login, OTP sending, and OTP verification to prevent abuse.
- **Protection**: 
  - **CORS**: Configured with allowed origins.
  - **DB Integrity**: Triggers are used to prevent stock adjustments on closed shifts.
  - **Hashing**: All passwords use **Bcrypt** (10 salt rounds).
- **PII**: SQL parameterization is used to prevent injection.

### 7. Deployment & Scaling
- **Environment**: Currently optimized for VPS or Docker-style deployments.
- **HTTPS**: Recommended to be handled via a Reverse Proxy (like Nginx/Certbot) in production.
- **Scaling**: The application is stateless except for sessions, making it ready for horizontal scaling once a session store (Redis) is added.

### 8. Third-party Integrations
- **Payments**: Currently utilizes a manual/placeholder flow. Stripe/PayPal integration is the next major roadmap item.
- **Core APIs**: Fully integrated with **Cloudinary** and **Google Gemini (AI Engine)**.
- **Search**: Currently relies on PostgreSQL `ILIKE`. Transitioning to a dedicated engine like ElasticSearch or pg_trgm is recommended for large datasets.
