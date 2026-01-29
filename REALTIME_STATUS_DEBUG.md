# Real-Time Pharmacy Status Testing Guide

## 🔍 **How to Debug the Real-Time Status Update**

### **Step 1: Open Browser Console**
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Go to the "Console" tab

### **Step 2: Visit Any Page**
You should immediately see:
```
✅ Socket.IO connected: [some-id]
```

If you don't see this, there's a Socket.IO connection issue.

### **Step 3: Toggle the Pharmacy Status**
1. Log in as a doctor
2. Go to `/doctor/dashboard`
3. Toggle the pharmacy status (OPEN ↔ CLOSED)

### **Step 4: Check Server Logs**
In your terminal where `nodemon` is running, you should see:
```
🔄 Pharmacy Status Toggle: { status: true, hasIO: true }
✅ Socket event emitted to all clients: { isOpen: true }
```

### **Step 5: Check Browser Console**
After toggling, you should see:
```
📡 Received pharmacy:status event: { isOpen: true }
🎯 Found 1 status badge(s) to update
✅ All badges updated successfully
```

---

## ❌ **Troubleshooting**

### **Issue: "Socket.IO connected" doesn't appear**
**Cause:** Socket.IO script not loading
**Fix:** Check network tab (F12 → Network) for `/socket.io/socket.io.js` - should return 200 OK

### **Issue: "hasIO: false" in server logs**
**Cause:** Socket.IO not attached to Express app
**Fix:** Already fixed - `app.set("io", io)` is in server.js

### **Issue: "Found 0 status badges"**
**Cause:** Element with class `pharmacy-status-badge` doesn't exist
**Fix:** Already added to header.ejs - refresh the page

### **Issue: Event received but UI doesn't update**
**Cause:** JavaScript error in update code
**Fix:** Check browser console for errors

---

## ✅ **What Should Happen**

1. **Instant Update:** Status badge changes color/text without page refresh
2. **Multi-Tab Sync:** All open tabs update simultaneously
3. **Cross-User Update:** Other users see the change in real-time
4. **Persistent:** After refresh, the new status is loaded from the database

---

## 🧪 **Testing Checklist**

- [ ] Server logs show socket emit
- [ ] Browser console shows socket connection
- [ ] Browser console shows event reception
- [ ] User page header updates
- [ ] Doctor dashboard updates
- [ ] Second browser tab updates
- [ ] Status persists after page refresh
