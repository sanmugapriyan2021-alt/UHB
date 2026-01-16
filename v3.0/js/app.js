"use strict";
document.addEventListener('DOMContentLoaded', () => {
    runMigrations();

    function runMigrations() {
        // Data Migration for Catalog (Phase 2 -> Phase 3)
        let migrated = false;
        Object.entries(state.catalog).forEach(([prod, items]) => {
            if (Array.isArray(items) && items.length > 0 && typeof items[0] === 'string') {
                state.catalog[prod] = items.map(s => ({ size: s, price: 0 }));
                migrated = true;
            }
        });
        if (migrated) state.save(DB_KEYS.CATALOG, state.catalog);

        // Data Migration for Datasets (Phase 4 -> Phase 5)
        // Data Migration for Datasets (Phase 4 -> Phase 5)
        if (state.transactions.length > 0) {
            console.log("Migrating transactions...");

            // Safe Merge: Only add if ID doesn't exist (prevent duplicates)
            const legacySales = state.transactions.filter(t => t.type === 'sell');
            const legacyPurchases = state.transactions.filter(t => t.type === 'buy');

            const currentSalesIds = new Set(state.sales.map(t => t.id));
            const newSales = legacySales.filter(t => !currentSalesIds.has(t.id));

            const currentPurchasesIds = new Set(state.purchases.map(t => t.id));
            const newPurchases = legacyPurchases.filter(t => !currentPurchasesIds.has(t.id));

            if (newSales.length > 0) {
                state.sales = [...state.sales, ...newSales];
                console.log(`Merged ${newSales.length} sales from legacy.`);
            }

            if (newPurchases.length > 0) {
                state.purchases = [...state.purchases, ...newPurchases];
                console.log(`Merged ${newPurchases.length} purchases from legacy.`);
            }

            // Clear old key but keep array empty for now to avoid re-migration
            state.transactions = [];
            localStorage.removeItem(DB_KEYS.TX);
            showToast("Data migrated to separate Sales/Purchase datasets.");
        }

        // Catalog Migration (v2 -> v3 separate catalogs)
        if (Object.keys(state.catalog).length > 0 &&
            localStorage.getItem(DB_KEYS.CATALOG_SALES) === null) {

            // Copy existing catalog to Sales (Standard Blocks/Rings)
            state.catalogSales = JSON.parse(JSON.stringify(state.catalog));
            state.saveCatalog('sales');

            // Keep the default Purchase catalog (Dust/Jalli/Cement)
            state.saveCatalog('buy');

            // Clear old key
            localStorage.removeItem(DB_KEYS.CATALOG);
            state.catalog = {};
            showToast("Catalogs separated for Sales and Purchases.");
        }
    }

    // Role Migration: Master -> Technical Team
    let usersMigrated = false;
    const updatedUsers = state.users.map(u => {
        if (u.role === 'Master') {
            usersMigrated = true;
            return { ...u, role: 'Technical Team' };
        }
        return u;
    });
    if (usersMigrated) {
        state.users = updatedUsers; // Triggers save
        console.log("Migrated legacy 'Master' users to 'Technical Team'.");
    }

    // Explicitly clean up invalid roles from the database (e.g. removed roles)
    // Allowed: Technical Team, Owner, Staff/Worker
    const allowedRoles = ['Technical Team', 'Owner', 'Worker', 'Staff'];
    if (state.users.some(u => !allowedRoles.includes(u.role))) {
        const initialCount = state.users.length;
        state.users = state.users.filter(u => allowedRoles.includes(u.role));
        if (state.users.length < initialCount) {
            // Silently saved by proxy
            console.log("System verified user roles.");
        }
    }



    auth.init();
    document.getElementById('t-date').valueAsDate = new Date();

    // Login Listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const u = document.getElementById('login-user').value.trim();
                const p = document.getElementById('login-pass').value.trim();

                const result = auth.login(u, p);
                if (!result.success) {
                    // Unified Professional Alert for Login Failure
                    showAlert(result.msg, "Login Failed", "error");

                    // Keep Shake for visual feedback
                    const box = document.querySelector('.login-box');
                    if (box) {
                        box.classList.remove('shake');
                        void box.offsetWidth;
                        box.classList.add('shake');
                    }

                    // Clear password
                    document.getElementById('login-pass').value = '';
                }
            } catch (err) {
                console.error("Login Error:", err);
                showAlert("System Error: " + err.message, "Critical Error", "error");
            }
        });
    } else {
        console.error("Login form not found!");
    }

    // Signup Listener
    document.getElementById('signupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('signup-user').value.trim();
        const p = document.getElementById('signup-pass').value.trim();
        auth.handleSignup(u, p);
    });



    // Initial Dashboard Mode
    setDashMode('sales');

    // Set up status change listener for settlement fields
    toggleSettlementFields();
});

