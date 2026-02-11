# Hosam Pharmacy Management System

A comprehensive, production-ready pharmacy management system designed to streamline inventory control, sales, staff management, and patient care. Built with Node.js, Express, and PostgreSQL, it features real-time communication, role-based access control, and a modern user interface.

## 🚀 Features

-   **User Authentication & Security**:
    -   Secure Login/Signup with Email & Password (bcrypt hashing).
    -   Google OAuth Integration.
    -   Two-Factor Authentication (OTP) for sensitive actions.
    -   Role-Based Access Control (RBAC): Admin, Doctor, Pharmacist, User.
    -   Session management via Redis.

-   **Inventory & Sales Management**:
    -   Real-time stock tracking and adjustments.
    -   Product categorization and search.
    -   Sales processing and order history.
    -   Prescription management and processing.

-   **Real-time Communication**:
    -   Live chat between Patients and Doctors/Pharmacists.
    -   Real-time notifications for order updates and announcements.
    -   Powered by Socket.io.

-   **Admin Dashboard**:
    -   Comprehensive analytics (Sales, User Growth, Inventory Health).
    -   User management (Doctors, Staff, Patients).
    -   System-wide settings and configuration.
    -   Audit logs and performance ledgers.

-   **Additional Features**:
    -   **Internationalization (i18n)**: Support for multiple languages (defaulting to English).
    -   **Scheduled Announcements**: Automated system announcements.
    -   **Coupons & Promotions**: Management of discount codes.

## 🛠️ Tech Stack

-   **Backend**: Node.js, Express.js
-   **Database**: PostgreSQL
-   **Caching & Session Store**: Redis
-   **Real-time Engine**: Socket.io
-   **Frontend**: EJS (Embedded JavaScript Templates), TailwindCSS
-   **Authentication**: Passport.js (Local, Google)
-   **Other Tools**: Docker (optional), Nodemailer (Email), Cloudinary (Image Uploads).

## ⚙️ Installation & Setup

Follow these steps to set up the project locally.

### Prerequisites

-   Node.js (v18+ recommended)
-   PostgreSQL
-   Redis
-   npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/hosam-pharmacy.git
cd hosam-pharmacy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and configure the following variables (reference `.env.example` if available):

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/hosam_pharmacy

# Redis Configuration
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your_super_secret_session_key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Email Service (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Cloudinary (Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Other
JWT_SECRET=your_jwt_secret
```

### 4. Database Setup

Run the provided SQL schema to initialize the database tables.

```bash
psql -U your_db_user -d hosam_pharmacy -f schema.sql
```

> **Note**: Ensure your PostgreSQL server is running and the database `hosam_pharmacy` exists before running the schema.

### 5. Start the Application

**Development Mode:**

```bash
npm run dev
# or if nodemon is not configured in scripts:
node server.js
```

**Production Mode:**

```bash
npm start
```

## 📖 Usage

1.  **Access the App**: Open your browser and navigate to `http://localhost:3001`.
2.  **Default Admin**: There is no default admin account created by the schema. You may need to manually insert an admin user into the database or register a new user and update their role to `admin` via SQL:
    ```sql
    UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
    ```
3.  **Explore**:
    -   **Shop**: Browse products, add to cart, and checkout.
    -   **Dashboard**: Log in as Admin to view the admin panel (`/admin/dashboard`).
    -   **Chat**: Log in and use the chat feature to talk to available doctors.

## 🔌 API Endpoints

The application primarily uses Server-Side Rendering (SSR) with EJS, but exposes several API-like routes for dynamic content.

### Authentication (`/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/auth/login` | Log in a user |
| POST | `/auth/register` | Register a new user |
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/logout` | Log out |

### Admin (`/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/admin/dashboard` | Main admin dashboard |
| GET | `/admin/users/all` | List all users |
| GET | `/admin/inventory` | Manage inventory |
| POST | `/admin/products/add` | Add a new product |

### Products & Categories
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/category/:slug/products` | Get products by category (JSON) |
| GET | `/search` | Search for medicines |

## 🧪 Testing

Currently, there are no automated tests specified in the `package.json`.

To run tests (if implemented):
```bash
npm test
```

## 📦 Deployment

### Docker Deployment

1.  Build the Docker image:
    ```bash
    docker build -t hosam-pharmacy .
    ```
2.  Run the container:
    ```bash
    docker run -p 3001:3001 --env-file .env hosam-pharmacy
    ```

### Manual Deployment (Linux/Ubuntu)

1.  Set up Node.js, PostgreSQL, and Redis on your server.
2.  Clone the repo and install dependencies.
3.  Use `pm2` to keep the app running:
    ```bash
    npm install -g pm2
    pm2 start server.js --name "hosam-pharmacy"
    ```
4.  Configure Nginx as a reverse proxy to forward traffic to port 3001.

## 🤝 Contributing

Contributions are welcome!

1.  **Fork** the repository.
2.  Create a new **Branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  Open a **Pull Request**.

Please ensure your code follows the existing style and conventions.

## 📄 License

This project is licensed under the **ISC License**.

## 📞 Contact

For questions or support, please contact the development team.

-   **Email**: [contact@example.com](mailto:contact@example.com)
-   **GitHub**: [github.com/yourusername](https://github.com/yourusername)
