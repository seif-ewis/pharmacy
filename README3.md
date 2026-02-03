# Doctor Dashboard – How It Works & Why It Makes Many Requests

This document explains how the doctor dashboard works and how real-time updates are delivered (event-driven + fallback). It is intended to help with debugging, optimization, or reducing server load.

---

## 0. Current Architecture (Event-Driven, Low Polling)

The dashboard is now **event-driven** where possible:

- **Initial load:** One REST request `GET /doctor/dashboard` returns the full page and baseline data.
- **Real-time updates:** The server emits Socket.IO events to the `doctors` room when data changes:
  - **dashboard:stats-update** – when orders, prescriptions, pharmacy status, or shift data change (client refetches `GET /doctor/dashboard/stats`).
  - **orders:new** / **orders:update** – when an order is created or its status changes (client refetches orders list only if Orders tab is visible).
  - **prescriptions:new** / **prescriptions:update** – when a prescription is uploaded or processed (client refetches prescriptions list only if Prescriptions tab is visible).
  - **pharmacy:status** – when open/closed is toggled.
  - **announcement:new** / **chat:message** – for announcements and chat.
- **Fallback polling:** Stats are refetched at most **every 60 seconds**, and **only when the tab is visible** (Page Visibility API). No 5s or 3s polling.
- **Module data:** Orders and Prescriptions lists load **on first tab activation**; further updates are via Socket.IO (no interval polling).

**Server-side:** `src/utils/doctorDashboardEvents.js` emits to `doctors`; `getDashboardStats` uses merged DB queries (fewer round-trips).

---

## 1. Overview

The doctor dashboard is a **single-page style** UI: one route (`GET /doctor/dashboard`) renders the full page, and then **JavaScript** switches between “modules” (Overview, Orders, Prescriptions, Returns, etc.) without full page reloads. Data for each module is loaded via **fetch** calls to API endpoints. Several of these are run on a **timer** (polling), which is the main cause of “too many requests.”

---

## 2. Initial Page Load (One Big Request)

**Route:** `GET /doctor/dashboard`  
**Controller:** `doctorController.getDashboard`  
**View:** `view/doctor/dashboard.ejs`

When the doctor opens the dashboard, the server:

1. Loads the doctor’s **active shift** (if any) and **global** shift.
2. For the active shift, runs DB queries for:
   - Gross revenue, refunds, net revenue
   - Order count, return count
   - Prescriptions processed in the shift
3. Loads **pending prescriptions** (with user names).
4. Loads **active orders** (scheduled / pending / processing) with user info.
5. Loads **product request** trending data (top 10).
6. Loads **previous shifts** (last 10) for the doctor.
7. Loads **pharmacy status** (open/closed) and **settings** (tax, delivery fee).
8. Loads **categories** for medicines.

All of this is done in **one** request and passed into the EJS template. So the initial load is a single, heavy server round-trip, not many small ones.

---

## 3. Polling (Why You See “Too Many Requests”)

After the page loads:

### 3.1 Dashboard stats (Overview numbers)

| What | Endpoint | When |
|------|----------|------|
| Update revenue, orders, prescriptions, alerts | `GET /doctor/dashboard/stats` | Once on load, then **every 5 seconds** (inline script) |
| Same | Same | Once on `DOMContentLoaded`, then **every 30 seconds** (external script) |

- **Location (5 s):** `view/doctor/dashboard.ejs` – “Initialize stats polling” block: `setInterval(updateDashboardStats, 5000)`.
- **Location (30 s):** `view/doctor/dashboard_stats_script.js` (and `public/doctor/dashboard_stats_script.js`) – `setInterval(updateDashboardStats, 30000)`.

So **stats are polled every 5 seconds** as long as the overview is relevant (and the 30 s timer adds extra calls). The stats endpoint runs several DB queries (shift, orders count, prescriptions count, low stock, scheduled orders, product requests, pharmacy status, etc.) on each call.

### 3.2 Orders module

| What | Endpoint | When |
|------|----------|------|
| List/filter orders | `GET /doctor/orders/all` | When the Orders module becomes visible, then **every 3 seconds** while that tab is visible |

- **Location:** `view/doctor/dashboard.ejs` – Orders module logic: `setInterval(..., 3000)` calling `loadOrders(true)` when the orders module is not hidden.

So with **Overview** and **Orders** both “active” (e.g. user on Overview but Orders tab was opened), you get:

- Stats: every 5 s  
- Orders: every 3 s  

That’s a lot of requests per minute even with a single user.

### 3.3 Prescriptions module

| What | Endpoint | When |
|------|----------|------|
| Pending prescriptions list | `GET /doctor/prescriptions/pending` | When the Prescriptions module becomes **visible**. Further updates via **Socket.IO `prescriptions:new` / `prescriptions:update`** (no interval polling). |

---

## 4. On-Demand Requests (When User Does Something)

These run only when the user switches tab or performs an action (no fixed timer).

| Action | Endpoint | Method |
|--------|----------|--------|
| Open **Requests** tab | `/doctor/requests` | GET |
| Open **Chat** tab | `/doctor/chats/active` | GET |
| Open **Announcements** tab | `/doctor/announcements` | GET |
| Open **Returns** tab / load pending | `/doctor/returns/pending` | GET |
| Load recent returns | `/doctor/returns/recent` | GET |
| Open **Inventory** tab | `/doctor/inventory` | GET |
| Open **Reports** tab, change range | `/doctor/reports/analytics?range=...` | GET |
| Open **Orders** tab (first time / visibility) | `/doctor/orders/all` | GET |
| Open **Prescriptions** tab (first time / visibility) | `/doctor/prescriptions/pending` | GET |
| Toggle pharmacy open/closed | `/doctor/pharmacy/toggle` | POST |
| Update order status | `/doctor/orders/status` | POST |
| Load order items | `/doctor/orders/:orderId/items` | GET |
| Load shift details | `/doctor/shift/:id` | GET |
| Load prescription details | `/doctor/prescriptions/:id/details` | GET |
| Search medicines | `/doctor/medicines/search?query=...` | GET |
| Prescription decision / analyze | `/doctor/prescriptions/decision`, `/doctor/prescriptions/analyze` | POST |
| Returns: search order, order items, process, action, action-inline | Various `/doctor/returns/...` | GET/POST |
| Inventory CRUD, most-sold | `/doctor/inventory`, `/doctor/inventory/most-sold`, etc. | GET/POST/PUT/DELETE |
| Product requests, fulfill | `/doctor/requests`, `/doctor/requests/fulfill` | GET/POST |
| AI assist (product) | `/doctor/product/ai-assist` | POST |
| Chats: messages, send | `/doctor/chats/:chatId/messages`, `/doctor/chats/send` | GET/POST |
| Announcements create | `/doctor/announcements/create` | POST |
| Create manual order | `/doctor/orders/create-manual` | POST |

So in addition to the timers above, each tab switch or button click can trigger one or more of these.

---

## 5. Socket.IO (Real-Time)

The page loads Socket.IO and subscribes to:

- **dashboard:stats-update** – server emits when orders, prescriptions, pharmacy status, or shift data change; client refetches stats.
- **orders:new**, **orders:update** – server emits on order create/update; client refetches orders list if Orders tab is visible.
- **prescriptions:new**, **prescriptions:update** – server emits on prescription upload/process; client refetches prescriptions list if Prescriptions tab is visible.
- **pharmacy:status** – server emits on open/closed toggle.
- **announcement:new**, **chat:message**
- **online:users**, **user:online**, **user:offline**

The server emits these from `src/utils/doctorDashboardEvents.js` and from the relevant controllers (order, prescription, doctor, announcement).

---

## 6. Summary: Request Load (After Optimization)

1. **Stats:** One request on load; then only when the server emits **dashboard:stats-update** (client refetches) or when the **60 s fallback** runs **and** the tab is visible.
2. **Orders:** One request when the Orders tab is shown; then refetches only on **orders:new** / **orders:update** when that tab is visible.
3. **Prescriptions:** One request when the Prescriptions tab is shown; then refetches only on **prescriptions:new** / **prescriptions:update** when that tab is visible.
4. **Tab switches** – Each module still does one fetch when first opened (on-demand).

---

## 7. Implemented Optimizations

1. **Server emits events** – `src/utils/doctorDashboardEvents.js`; controllers (order, prescription, doctor, announcement) emit `dashboard:stats-update`, `orders:new`/`orders:update`, `prescriptions:new`/`prescriptions:update`, `pharmacy:status`, `announcement:new` to the `doctors` room.
2. **Stats:** Socket-driven refetch + single fallback at 60 s, only when tab is visible (Page Visibility API).
3. **Orders / Prescriptions:** No interval polling; load on first tab activation; refetch only on Socket events when that tab is visible.
4. **Single stats source** – External `dashboard_stats_script.js` is no longer loaded; all stats logic is inline to avoid duplicate timers.
5. **Merged DB queries** – `getDashboardStats` uses fewer queries (one for global counts + pharmacy status, one for shift metrics when applicable).

---

## 8. File Reference

| File | Role |
|------|------|
| `view/doctor/dashboard.ejs` | Full dashboard markup + inline JS (stats 5 s, orders 3 s, prescriptions 30 s, all on-demand handlers). |
| `view/doctor/dashboard_stats_script.js` | Legacy stats script (not loaded by dashboard anymore). |
| `public/doctor/dashboard_stats_script.js` | Same (not loaded); stats are handled inline in dashboard.ejs. |
| `src/utils/doctorDashboardEvents.js` | Emits Socket.IO events to `doctors` room (orders, prescriptions, stats, etc.). |
| `view/doctor/dashboard_overview_new.ejs` | Overview partial (shift banner, counters, alerts) – no requests by itself. |
| `src/controllers/doctorController.js` | `getDashboard`, `getDashboardStats`, and all other doctor API handlers. |
| `src/routes/indexRoutes.js` | Doctor routes (`/doctor/dashboard`, `/doctor/dashboard/stats`, `/doctor/orders/all`, etc.). |

---

*This document describes the behavior of the doctor dashboard as implemented in the codebase. Adjust intervals and logic in the files above to reduce the number of requests.*
