# Admin Dashboard – How It Works

This document describes how the **admin dashboard** works: routes, data flow, modules, and when HTTP or Socket.IO requests are made. It does not cover the doctor dashboard (README3.md) or user/home pages (README4.md).

---

## 0. Overview

- The admin dashboard is a **single-page style** UI: one route (`GET /admin/dashboard`) renders the shell (top bar + sidebar). **Module content** is loaded on demand via `GET /admin/module/:name`, which returns HTML partials.
- **No full page reload** when switching modules; the main content area is updated by fetching the partial and injecting it, then running any module-specific init (e.g. `initializeOverview()`).
- **Top bar** (store status, active shift, live revenue) is updated in **near-real time** via **Socket.IO**: the server emits `admin:summary-update` to the `admin` room when orders, shifts, pharmacy status, or prescriptions change. The client refetches `GET /admin/summary` on that event. A **30s fallback** poll runs only when the tab is **visible** (Page Visibility API).
- **Socket.IO:** Room join happens **after authentication**: the server joins admin users to the `admin` room on connection; the client emits `join` `admin` on `connect` for resilience (server validates and only allows admins). On disconnect, Socket.IO automatically removes the socket from all rooms (no manual cleanup needed). The client listens for `announcement` (toasts) and `admin:summary-update` (top bar refresh); the listener is registered in the head before connection completes to avoid missing the first push, and the top bar is refreshed on every `connect` (including reconnect) for network resilience.
- All routes under `/admin/*` are protected by **ensureAdmin** middleware.

---

## 1. Initial Page Load

**Route:** `GET /admin/dashboard`  
**Handler:** Renders `view/admin/dashboard.ejs` with `{ user, pageTitle }` only. No server-side data is loaded for modules at this step.

**View:** `view/admin/dashboard.ejs`

- Renders the **top bar** (store status, active shift badge or “No Active Shift”, user info).
- Renders the **sidebar** with nav buttons for each module (Overview, Orders, Shift Log, Prescriptions, Inventory, Doctors, Patients, Analytics, Ledger, Coupons, Settings, Audit, Announcements).
- Renders an empty **content area** and a **global drawer** (for detail panels).

**On load (client):**

1. `window.onload` runs: `showModule(hash || 'overview')`, then `updateTopBar()`, then starts the 30s fallback only when the tab is visible.
2. **showModule(name):**  
   - Fetches `GET /admin/module/:name`.  
   - Server renders `view/admin/partials/:name.ejs` (no layout) and returns HTML.  
   - Client sets `container.innerHTML = html`, re-executes inline scripts, calls `initialize{Name}()` if defined, and sets `window.location.hash`.
3. **updateTopBar():**  
   - Fetches `GET /admin/summary`.  
   - Updates store status (ONLINE/OFFLINE), active shift badge (doctor name, start time, live revenue), or “No Active Shift” warning.
4. **Socket:** The `admin:summary-update` listener is registered in `admin_head.ejs` as soon as the socket is created (before connection completes), so the first server push is never missed. On every `connect` (and if already connected at load), the dashboard runs `updateTopBar()` so reconnects get fresh data.

So the **first request** is `GET /admin/dashboard` (shell), then **GET /admin/module/overview** (or the hash module), then **GET /admin/summary** (top bar). After that, the top bar is updated on **Socket.IO `admin:summary-update`** and by a **30s fallback** only when the tab is visible.

---

## 2. Module Loading (Dynamic Partials)

**Route:** `GET /admin/module/:name`  
**Controller:** `adminModuleController.getModulePartial`  
**View:** `view/admin/partials/:name.ejs`

- **Whitelist:** Only these `name` values are allowed: `overview`, `orders`, `shift`, `prescriptions`, `inventory`, `doctors`, `users`, `analytics`, `ledger`, `coupons`, `settings`, `audit`, `announcements`.
- **RBAC:** Server checks `req.user.role` and `req.user.roles` against `MODULE_PERMISSIONS[name]`. If the user is not allowed, it returns 403/404 HTML.
- **Response:** Rendered HTML for the partial (no layout). Each partial can include its own `<script>` blocks; the dashboard re-executes them after injection.

When the user clicks a sidebar item, `showModule(name)` runs and triggers **one GET /admin/module/:name** for that module. Each module partial may then run its own **fetch** calls when its script runs (e.g. Overview fetches `/admin/stats` and `/admin/summary`; Orders fetches `/admin/history/orders?…`).

---

## 3. Top Bar: Real-Time + Fallback

| What              | Endpoint / mechanism   | When |
|-------------------|------------------------|------|
| Top bar (store + shift + revenue) | `GET /admin/summary` | Once on load; then on **Socket.IO `admin:summary-update`**; **fallback every 30s** only when tab is **visible** (Page Visibility API) |

- **Location:** `view/admin/partials/admin_head.ejs` – `socket.on('admin:summary-update', ...)` (calls `window.updateTopBar` when defined); `view/admin/dashboard.ejs` – `updateTopBar()`, `window.updateTopBar` assignment, connect/reconnect handler that runs `updateTopBar()`, and a single fallback interval started/stopped by `visibilitychange`.
- **Server emits** `admin:summary-update` from `src/utils/adminDashboardEvents.js` when: pharmacy status toggle (doctor or admin), order created/cancelled, order status updated (doctor), prescription uploaded/processed, shift started/ended.
- **Payload:** `summary` returns `is_open`, `today_revenue`, `pending_prescriptions`, `low_stock_count`, `active_shift`. The client updates the top bar DOM from this.

There is **no** other polling interval in the admin dashboard (e.g. no per-module timer). Module data is loaded **once** when the module is shown (and when the user changes filters/pagination inside that module).

---

## 4. Module-Specific Requests

Each module partial runs when it is loaded; many run one or more **fetch** calls to load their data. These are **on-demand** (when the module is shown or when the user changes options), not on a timer.

| Module        | Endpoint(s) | When |
|---------------|-------------|------|
| **Overview**  | `GET /admin/stats` | When Overview module is loaded (KPIs: today revenue, orders, doctors, coupons; cached 30s on server). |
|               | `GET /admin/summary` | When Overview is loaded (pending prescriptions, low stock, active shift for alerts/panels). |
| **Orders**    | `GET /admin/history/orders?search=…&status=…&page=…` | When Orders module is loaded or filters/pagination change. |
|               | `GET /admin/history/orders/:id` | When opening an order detail (e.g. drawer). |
| **Shift**     | `GET /admin/summary` | When Shift module is loaded. |
|               | `GET /admin/history/shifts?page=…&limit=5` | When Shift module is loaded or “Load more”. |
|               | `GET /admin/history/shifts/:id` | When opening a shift detail. |
| **Prescriptions** | `GET /admin/prescriptions?status=…` | When Prescriptions module is loaded or status tab changes. |
|               | `GET /admin/prescriptions/:id` | When opening a prescription detail. |
|               | `POST /admin/prescriptions/:id/process` | When processing a prescription. |
| **Inventory** | `GET /admin/inventory?search=…&status=…` | When Inventory module is loaded or search/status change. |
|               | `GET /admin/history/inventory?performedBy=…&type=…` | When viewing inventory history. |
|               | `POST /admin/inventory/adjust` | When submitting a stock adjustment. |
|               | `GET /admin/doctors` | When needed (e.g. for dropdowns). |
| **Doctors**   | `GET /admin/doctors` | When Doctors module is loaded. |
|               | `POST /admin/doctors/add` | When adding a doctor. |
|               | `GET /admin/history/doctor-shifts/:id` | When opening a doctor’s shift history. |
| **Users (Patients)** | `GET /admin/users/all?search=…` | When Users module is loaded or search changes. |
|               | `GET /admin/history/user-orders/:id` | When opening a user’s orders. |
| **Analytics** | `GET /admin/analytics/detailed?startDate=…&endDate=…` | When Analytics module is loaded or date range changes. |
| **Ledger**    | `GET /admin/performance-ledger?grain=…` | When Ledger module is loaded or grain (e.g. day/week/month) changes. |
| **Coupons**   | `GET /admin/coupons` | When Coupons module is loaded. |
|               | `POST /admin/coupons/add` | When adding a coupon. |
|               | `POST /admin/coupons/:id/toggle` | When toggling a coupon. |
|               | `DELETE /admin/coupons/:id` | When deleting a coupon. |
| **Settings**  | `GET /admin/settings` | When Settings module is loaded. |
|               | `POST /admin/settings/update` | When saving settings. |
|               | `POST /admin/settings/toggle-status` | When toggling store status. |
| **Audit**     | `GET /admin/audit/logs?…` | When Audit module is loaded or filters change. |
|               | `GET /admin/audit/details/:id` | When opening an audit detail. |
| **Announcements** | `GET /admin/announcements` | When Announcements module is loaded. |
|               | `POST /admin/announcements/create` | When creating an announcement. |

The **standalone** Settings page (`view/admin/settings.ejs`) uses `GET /admin/settings` and `POST /admin/settings/update` (and possibly toggle) in the same way; it is a full page, not loaded via `/admin/module/settings`.

---

## 5. Socket.IO (Admin)

- **Connection:** `view/admin/partials/admin_head.ejs` loads Socket.IO and runs `const socket = io(); window.socket = socket;`. On `connect`, the client emits `join` `admin`; the server **validates** and only allows users with admin role to join the `admin` room (non-admins cannot join). The server also joins admin users to the **admin** room when the connection is established (after session auth), so room join always happens after authentication.
- **Disconnect cleanup:** When an admin disconnects, Socket.IO automatically removes the socket from all rooms; no explicit leave is required and there is no memory buildup.
- **Listen:** `socket.on('announcement', ...)` – shows a toast when the server emits an announcement; `socket.on('admin:summary-update', ...)` – registered in the head and calls `window.updateTopBar()` so the top bar updates in near-real time. The dashboard runs `updateTopBar()` on every `connect` (and if already connected on load) so the first push is never missed and reconnects refresh the top bar.
- **Emit:** The server emits `admin:summary-update` to the `admin` room from doctorController (pharmacy toggle, order status, prescription processed, shift start/end), orderController (order create/cancel), prescriptionController (prescription upload), and adminSettingsController (pharmacy toggle).

---

## 6. Data Flow Summary

1. **Initial:** `GET /admin/dashboard` → shell; then `GET /admin/module/overview` (or hash) and `GET /admin/summary` for the top bar.
2. **Top bar:** Refreshed when the server emits `admin:summary-update` (near-real time) and by a **30s fallback** only when the tab is visible.
3. **On module switch:** `GET /admin/module/:name` → HTML partial; then the partial’s script runs and may call `GET /admin/stats`, `GET /admin/summary`, or module-specific endpoints (orders, shift, prescriptions, etc.).
4. **On user action in a module:** Filter change, pagination, “Load more”, open detail, submit form → one or more GET/POST to the endpoints listed above.

---

## 7. File Reference

| File / area | Role |
|-------------|------|
| `src/routes/adminRoutes.js` | All `/admin/*` routes; ensureAdmin applied to the router. |
| `src/utils/adminDashboardEvents.js` | Emits `admin:summary-update` to `admin` room when summary data changes. |
| `src/controllers/admin/adminModuleController.js` | Serves module HTML partials; whitelist and RBAC for `getModulePartial`. |
| `src/controllers/admin/adminAnalyticsController.js` | `getGlobalStats` (cached KPIs), `getDashboardSummary`, `getDetailedAnalytics`, `getPerformanceLedger`. |
| `src/controllers/admin/adminHistoryController.js` | Orders, shifts, returns, inventory history; doctor-shifts, user-orders. |
| `src/controllers/admin/adminUsersController.js` | Users (patients), doctors, add doctor. |
| `src/controllers/admin/adminInventoryController.js` | Inventory list, logs, adjust stock. |
| `src/controllers/admin/adminPrescriptionsController.js` | Prescriptions list, detail, process. |
| `src/controllers/admin/adminAuditController.js` | Audit logs, details. |
| `src/controllers/admin/adminCouponsController.js` | Coupons list, add, toggle, delete. |
| `src/controllers/admin/adminSettingsController.js` | Settings get/update, toggle status. |
| `view/admin/dashboard.ejs` | Shell: top bar, sidebar, content area, drawer; `showModule()`, `updateTopBar()`, connect/reconnect refresh, 30s fallback when tab visible. |
| `view/admin/partials/admin_head.ejs` | Head: Tailwind, FontAwesome, Anime.js, Toastify, Chart.js, Socket.IO; emit `join` `admin` on connect, `admin:summary-update` listener (calls `window.updateTopBar`), announcement listener. |
| `view/admin/partials/overview.ejs` | Overview: KPIs, alerts, shift panel; fetches `/admin/stats` and `/admin/summary`. |
| `view/admin/partials/orders.ejs` | Orders history; fetches `/admin/history/orders`, `/admin/history/orders/:id`. |
| `view/admin/partials/shift.ejs` | Shift log; fetches `/admin/summary`, `/admin/history/shifts`, `/admin/history/shifts/:id`. |
| `view/admin/partials/prescriptions.ejs` | Prescriptions; fetches prescriptions list/detail/process. |
| `view/admin/partials/inventory.ejs` | Inventory; fetches inventory, history, adjust, doctors. |
| `view/admin/partials/doctors.ejs` | Doctors; fetches doctors, add, doctor-shifts. |
| `view/admin/partials/users.ejs` | Patients; fetches users, user-orders. |
| `view/admin/partials/analytics.ejs` | Analytics; fetches `/admin/analytics/detailed`. |
| `view/admin/partials/ledger.ejs` | Performance ledger; fetches `/admin/performance-ledger`. |
| `view/admin/partials/coupons.ejs` | Coupons; fetches coupons, add, toggle, delete. |
| `view/admin/partials/settings.ejs` | Settings (as partial); fetches settings, update, toggle-status. |
| `view/admin/partials/audit.ejs` | Audit; fetches audit logs, details. |
| `view/admin/partials/announcements.ejs` | Announcements; fetches announcements, create. |
| `view/admin/settings.ejs` | Standalone settings page (if used); fetches/updates settings. |

---

## 8. Implementation Notes

- **Top bar:** Real-time is implemented: the server emits `admin:summary-update` when summary-relevant data changes; the client refetches and uses a 30s fallback only when the tab is visible. The listener is registered in the head (before connection) to avoid a race with the first server push; the top bar is refreshed on every socket `connect` (including reconnect) for network resilience. See `src/utils/adminDashboardEvents.js`.
- **Admin room security:** Only users with admin role can join the `admin` room; the server validates the `join` event and only joins the socket if `roles.includes('admin')` or `primaryRole === 'admin'`. Room join happens after session authentication.
- **Disconnect:** Socket.IO automatically removes disconnected sockets from all rooms; no manual leave is needed.
- **Module data:** Each module fetches when opened; there is no per-module polling. Optional: cache module HTML or data in the client and invalidate on a timeout or on Socket events.
- **Stats cache:** `getGlobalStats` already uses a 30s in-memory cache.

---

*This document describes the admin dashboard as implemented in the codebase. For the doctor dashboard see README3.md; for home and user pages see README4.md.*
