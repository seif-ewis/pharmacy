import db from "../../config/dataBase.js";

// Whitelist of allowed modules and their required base roles
const MODULE_PERMISSIONS = {
    'overview': ['admin'],
    'orders': ['admin', 'doctor'],
    'shift': ['admin'],
    'doctors': ['admin'],
    'inventory': ['admin'],
    'prescriptions': ['admin', 'doctor'],
    'users': ['admin'],
    'analytics': ['admin'],
    'ledger': ['admin'],
    'coupons': ['admin'],
    'settings': ['admin'],
    'audit': ['admin'],
    'announcements': ['admin'],
    'categories': ['admin'],
    'profile': ['admin']
};

export const getModulePartial = async (req, res) => {
    try {
        const { name } = req.params;
        const userRole = req.user.role;
        const userRoles = req.user.roles || [];

        // 1. Whitelist & RBAC Check
        if (!MODULE_PERMISSIONS[name]) {
            return res.status(404).send('<div class="p-8 text-red-500 font-bold">Module not found in whitelist.</div>');
        }

        const allowedRoles = MODULE_PERMISSIONS[name];
        const hasPermission = allowedRoles.includes(userRole) || userRoles.some(r => allowedRoles.includes(r));

        if (!hasPermission) {
            return res.status(403).send('<div class="p-8 text-red-500 font-bold uppercase tracking-widest">Access Denied: High Security Clearance Required.</div>');
        }

        // 2. Render Partial
        // We pass any extra context needed by the module here
        res.render(`admin/partials/${name}`, {
            user: req.user,
            layout: false // Ensure we don't render the full layout again
        });

    } catch (err) {
        console.error("Module Load Error:", err);
        res.status(500).send('<div class="p-8 text-red-500">Critical Error loading module.</div>');
    }
};
