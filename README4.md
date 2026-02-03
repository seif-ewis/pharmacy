# Home Page & User Pages – How They Work

This document describes how the **home page** and all **user-facing pages** work: routes, data flow, and when HTTP or Socket.IO requests are made. It does not cover the doctor dashboard (see README3.md) or admin (separate routes).

---

## 0. Overview

- **Home** and user pages are mostly **server-rendered**: one GET request loads the page with data from the server. There is **no polling** for data on the home or user side (only UI timers like carousels).
- **Global state** (notifications, pharmacy open/closed, cart count) is loaded or updated via:
  - **globalState middleware**: runs on every request; fetches unread notifications and pharmacy settings (cached 1 min) and puts them in `res.locals` for the header.
  - **Header**: live search uses `fetch('/search?q=...&ajax=1')`; marking notifications read uses `fetch` POST.
  - **Footer**: Socket.IO connects once; listens for `pharmacy:status` to update the badge site-wide.
- **Cart** is stored in **sessionStorage** (`guestCart`); no server cart until checkout.
- **Auth** (login, register, forgot password, reset) is handled via modals and `fetch` to `/auth/*` (see auth routes).

---

## 1. Home Page

**Route:** `GET /`  
**Controller:** `homeController.getHomePage`  
**View:** `view/home.ejs`

### What the server does

1. Loads **products by category** (featuredMedicines, dailyEssentials, wellnessProducts, servicesProducts): up to 10 per category, with stock, in one query.
2. If the user is **logged in**, loads **chat history** (active chat + messages) for the floating chat.
3. Renders the page with products, chat data (if any), and flash messages. Notifications and pharmacy settings come from **globalState** (not from the home controller).

### What the client does

- **Navigation:** Links to `/category/:slug`, `/products/:id`, `/prescription/upload`. No `fetch` for page-to-page navigation; full page loads.
- **Cart:** “Add to cart” updates **sessionStorage** (`guestCart`) and calls `updateCartUI()` / `window.dispatchEvent(new Event('storage'))` so the header cart count updates. No server request.
- **Chat (logged-in only):** Uses the **same Socket.IO** instance from `partials/footer.ejs`:
  - **Emit:** `typing`, `stop typing`, `chat message`.
  - **Listen:** `chat:message`, `doctor typing`, `doctor stop typing`. On new message, appends to UI and can play sound / show badge if modal is closed.
- **Carousels:** `setInterval` (e.g. 3500 ms) only to **auto-scroll** product carousels; no API calls. Timers are paused on mouseenter and restarted on mouseleave.
- **Animations:** Anime.js for hero and cards; no server interaction.

So the home page does **one GET /** for the initial load; after that, only Socket.IO (chat + pharmacy status from footer) and optional header search/notifications.

---

## 2. Global Layout (Header & Footer)

Used on home and all user pages (except where a different layout is used).

### Header (`partials/header.ejs`)

- **Pharmacy status badge:** Rendered from `res.locals.pharmacySettings` (from globalState). Updated live by **Socket.IO** `pharmacy:status` in the footer script.
- **Search (desktop & mobile):**
  - Form: `action="/search"` method GET (full page redirect when submitted).
  - **Live dropdown:** On input, after debounce, `fetch(\`/search?q=${query}&ajax=1\`)` → JSON; results rendered in dropdown. Clicking a result goes to `/search?q=...` (full page).
- **Cart icon:** Count from sessionStorage; `updateCartCount()` reads `guestCart` and updates the badge. No server call for cart count.
- **Notifications (logged-in):**
  - List is rendered from `res.locals.notifications` (from globalState).
  - **Mark one read:** `fetch(\`/notifications/${id}/read\`, { method: 'POST' })`.
  - **Mark all read:** `fetch('/notifications/read-all', { method: 'POST' })`.
  - No polling; list updates only when user opens the dropdown and clicks, or on next page load (globalState refetches).

### Footer (`partials/footer.ejs`)

- **Socket.IO:** `const socket = io();` (one connection per page).
- **Listens:** `pharmacy:status` → updates all `.pharmacy-status-badge` elements (header + any in footer).
- **Chat:** On home, the same `socket` is used for chat (see above). No extra connection.

---

## 3. Category Page

**Route:** `GET /category/:slug`  
**Controller:** `categoryController.getCategoryPage`  
**View:** `view/category.ejs`

- **Slugs:** `featured`, `essentials`, `wellness`, `services` (mapped to DB category values).
- **Query:** `sort` (newest | price-low | price-high | name).

### Initial load

- One GET returns the first page of products (12 per page), total count, and `nextCursor` (offset) for “Load more”.

### “Load more”

- **Fetch:** `GET /api/category/:slug/products?cursor=...&sort=...`
- **Controller:** `categoryController.getMoreProducts` returns JSON: `{ success, products, nextCursor, hasMore }`.
- **Client:** Appends product cards and updates “Load more” / end message. No polling; only on scroll/click.

---

## 4. Search

**Route:** `GET /search`  
**Controller:** `searchController.searchMedicines`  
**View:** `view/searchResults.ejs` (full page) or JSON (ajax).

- **Query:** `q` (search term). If missing or empty, redirects to `/`.
- **Behavior:**
  - **Normal request:** Renders `searchResults.ejs` with `medicines` and `query`.
  - **Ajax / JSON request:** `req.xhr || req.headers.accept includes application/json || req.query.ajax` → responds with `{ medicines }` (used by header live search).
- **DB:** One query, `ILIKE` on name/description, limit 50. No polling.

---

## 5. Product Detail Page

**Route:** `GET /products/:id`  
**Controller:** `productController.getProductDetails`  
**View:** `view/product.ejs`

### Server

- Loads product (with stock) and 4 related products (same category, random). Renders; no follow-up server call for initial data.

### Client

- **Cart:** Add to cart updates sessionStorage and header count (same as home); no server.
- **“Notify me when in stock”:** `fetch('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ medicineId }) })` (authenticated). One request per click.
- **Related carousel:** `setInterval` (e.g. 4 s) for auto-scroll only; no API.

---

## 6. Checkout

**Route:** `GET /checkout`  
**Controller:** `orderController.getCheckoutPage`  
**View:** `view/checkout.ejs`

- **Auth:** Required.
- **Server:** Loads user addresses and delivery fee (from settings). Renders form.

### Client

- **Add address:** Form `action="/profile/address/add?redirect=checkout"` POST (or JS that POSTs and then continues).
- **Calculate totals:** `fetch('/orders/calculate', { method: 'POST', body: JSON.stringify({ items, couponCode }) })` → returns subtotal, tax, delivery, total, etc. Called when cart/quantity/coupon changes.
- **Place order:** `fetch('/orders/checkout', { method: 'POST', body: JSON.stringify({ ... }) })` with address, items, coupon, etc. Then redirect or show success. No polling.

---

## 7. Orders (List & Detail)

**Routes:**  
- `GET /orders` → list (paginated)  
- `GET /orders/:id` → detail  
**Controllers:** `orderController.getOrders`, `orderController.getOrderDetails`  
**Views:** `view/orders/index.ejs`, `view/orders/details.ejs`

### List (`/orders`)

- Server returns one page of orders (with items, product requests). Pagination is server-rendered (e.g. page query). No client-side polling.
- **Cancel order:** Form POST to `/orders/:id/cancel` (or JS fetch). Shown per order when status allows.
- **Confirm product request:** `fetch(\`/orders/request/${requestId}/confirm\`, { method: 'POST' })` from `orders/index.ejs`.

### Detail (`/orders/:id`)

- One GET; cancel form POST to `/orders/:id/cancel` if applicable.

---

## 8. Profile

**Route:** `GET /profile`  
**Controller:** `userController.getProfile`  
**View:** `view/profile.ejs`

- **Auth:** Required.
- **Server:** Loads user and addresses; renders profile and address cards.

### Client

- **Forms (full submit or AJAX):**
  - **Profile update:** `POST /profile/update`
  - **Add address:** `POST /profile/address/add`
  - **Set default address:** `POST /profile/address/:id/default` (often called via `fetch` in JS, e.g. `fetch(\`/profile/address/${id}/default\`, { method: 'POST' })`)
  - **Delete address:** `POST /profile/address/:id/delete`
  - **Password:** `POST /profile/password`
  - **Avatar:** `POST /profile/avatar` (multipart, upload.single('avatar'))

No polling; all on user action.

---

## 9. Prescription Upload & Detail

**Routes:**  
- `GET /prescription/upload` → upload form  
- `POST /prescription/upload` → submit (multipart, upload.single('image'))  
- `GET /prescription/:id` → detail  
**Controller:** `prescriptionController`  
**Views:** `view/prescription/upload.ejs`, `view/prescription/details.ejs`

- Upload is a normal form POST; detail is one GET. No polling.

---

## 10. Return Request

**Routes:**  
- `GET /orders/:orderId/return` → return form  
- `POST /orders/return` → submit return  
**Controller:** `returnController.getReturnPage`, `returnController.submitReturnRequest`  
**View:** `view/orders/return_request.ejs`

- One GET for the form; one POST for submit. No polling.

---

## 11. Product Request (Request a Product)

**Routes:**  
- `GET /orders/request/new` → request form (simple render)  
- `POST /orders/request` → submit request  
- `GET /orders/requests/me` → user’s requests (if used)  
- `POST /orders/request/:requestId/confirm` → confirm (e.g. from orders list)  
**Controller:** `requestController`  
**View:** `view/orders/request.ejs`

- Form submit or `fetch('/orders/request', { method: 'POST', ... })`; confirm via fetch from orders index. No polling.

---

## 12. Static / Policy Pages

- **Privacy:** `GET /privacy-policy` → `view/privacyPolicy.ejs`
- **Terms:** `GET /terms` → `view/termOfUse.ejs`
- **Return policy:** `GET /return-policy` → `view/returnPolicy.ejs`

No data fetching; static render.

---

## 13. Auth (Modals + Routes)

**Routes:** Under `/auth` (authRoutes): login, register, verify-email, forgot-password, verify-reset-code, reset-password, logout, Google OAuth.

- **UI:** Login/register/forgot/reset are in `partials/auth_modals.ejs`; many flows use `fetch` to the auth endpoints and then redirect or show messages.
- **Session:** After login, session cookie is set; globalState and protected routes use `req.user`. No polling.

---

## 14. Notifications API (User)

- **GET /notifications** – get list (if used by a dedicated page; otherwise header uses globalState).
- **POST /notifications/read-all** – mark all read (header).
- **POST /notifications/:id/read** – mark one read (header).
- **POST /notifications/subscribe** – subscribe to stock alerts for a product (product page “Notify me”). Auth required.

---

## 15. Summary Table (User & Home)

| Page / Feature      | Initial request        | Other requests / behavior |
|---------------------|------------------------|----------------------------|
| Home                | GET /                  | Socket (chat, pharmacy); carousel timers (UI only); cart in sessionStorage |
| Header search       | —                      | fetch GET /search?q=...&ajax=1 (debounced) |
| Header notifications| —                      | Rendered from globalState; POST /notifications/:id/read, POST /notifications/read-all on user action |
| Footer              | —                      | Socket.IO connect; listen pharmacy:status |
| Category            | GET /category/:slug    | GET /api/category/:slug/products for “Load more” |
| Search              | GET /search?q=...      | Optional ajax=1 for header dropdown |
| Product             | GET /products/:id      | POST /notifications/subscribe (“Notify me”); carousel timer (UI only) |
| Checkout            | GET /checkout          | POST /orders/calculate; POST /orders/checkout; optional POST /profile/address/add |
| Orders list         | GET /orders            | POST /orders/:id/cancel; POST /orders/request/:id/confirm |
| Order detail        | GET /orders/:id        | POST /orders/:id/cancel |
| Profile             | GET /profile           | POST profile/update, address add/default/delete, password, avatar |
| Prescription upload | GET /prescription/upload | POST /prescription/upload |
| Prescription detail | GET /prescription/:id  | — |
| Return request      | GET /orders/:orderId/return | POST /orders/return |
| Product request     | GET /orders/request/new | POST /orders/request |
| Auth                | —                      | POST /auth/login, register, etc. (modals) |

---

## 16. File Reference

| File / area              | Role |
|--------------------------|------|
| `src/controllers/homeController.js` | Home data (products by category, chat history). |
| `src/controllers/categoryController.js` | Category page + getMoreProducts API. |
| `src/controllers/searchController.js` | Search (full page + ajax). |
| `src/controllers/productController.js` | Product detail + related. |
| `src/controllers/orderController.js`   | Checkout, orders list/detail, calculate, create, cancel. |
| `src/controllers/userController.js`   | Profile, addresses, password, avatar. |
| `src/controllers/prescriptionController.js` | Upload, detail. |
| `src/controllers/returnController.js`  | Return page, submit return. |
| `src/controllers/requestController.js`| Product request submit, confirm. |
| `src/controllers/notificationController.js` | Notifications list, read, subscribe. |
| `src/middleware/globalState.js`       | Notifications + pharmacy settings for every request; cache for settings. |
| `view/home.ejs`          | Home markup, cart (sessionStorage), chat (Socket), carousels. |
| `view/partials/header.ejs`| Search form + live fetch; notifications; cart count from sessionStorage. |
| `view/partials/footer.ejs`| Socket.IO; pharmacy:status. |
| `view/category.ejs`      | Category grid; Load more fetch. |
| `view/product.ejs`       | Product detail; subscribe; related carousel. |
| `view/checkout.ejs`       | Calculate + checkout fetch. |
| `view/orders/index.ejs`   | Orders list; cancel; request confirm. |
| `view/profile.ejs`        | Profile forms; address default fetch. |
| `view/partials/auth_modals.ejs` | Login/register/forgot/reset fetch. |
| `src/routes/indexRoutes.js` | All non-admin, non-auth routes listed above. |
| `src/routes/authRoutes.js`   | Auth endpoints. |

---

*This document describes the home and user-facing flows as implemented in the codebase. For the doctor dashboard and request/polling behavior, see README3.md.*
