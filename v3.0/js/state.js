"use strict";
const DB_KEYS = {
    TX: 'udt_tx_v2', // Deprecated (Used for Migration Phase 4->5 only)
    SALES: 'udt_sales_v3',
    PURCHASE: 'udt_purchase_v3',
    CATALOG_SALES: 'udt_catalog_sales_v1',
    CATALOG_PURCHASE: 'udt_catalog_purchase_v1',
    CATALOG: 'udt_catalog_v2', // Keep for migration
    TRADERS: 'udt_traders_v2',
    USERS: 'udt_users_v2',
    THRESHOLDS: 'udt_thresholds_v2',
    PASS_REQS: 'udt_pass_reqs_v2',
    SIGNUP_REQS: 'udt_signup_reqs_v2'
};

class Store {
    constructor() {
        // Internal data storage
        this._data = {
            sales: this.load(DB_KEYS.SALES, []),
            purchases: this.load(DB_KEYS.PURCHASE, []),
            transactions: this.load(DB_KEYS.TX, []), // Migration
            catalogSales: this.load(DB_KEYS.CATALOG_SALES, {
                'Block': [{ size: '6 inch', price: 50 }, { size: '4 inch', price: 40 }, { size: '8 inch', price: 60 }],
                'Ring': [{ size: '3 ft', price: 500 }, { size: '4 ft', price: 700 }, { size: '2 ft', price: 300 }],
                'Cover': [{ size: '1.5 ft', price: 200 }, { size: '2 ft', price: 250 }]
            }),
            catalogPurchase: this.load(DB_KEYS.CATALOG_PURCHASE, {
                'Dust': [{ size: 'Default', price: 0 }],
                'Jalli': [{ size: 'Default', price: 0 }],
                'Cement': [{ size: 'Default', price: 0 }]
            }),
            catalog: this.load(DB_KEYS.CATALOG, {}),
            traders: this.load(DB_KEYS.TRADERS, { 'Walk-in': 'Unknown' }),
            users: this.load(DB_KEYS.USERS, []),
            passRequests: this.load(DB_KEYS.PASS_REQS, []),
            thresholds: this.load(DB_KEYS.THRESHOLDS, {}),
            signupRequests: this.load(DB_KEYS.SIGNUP_REQS, []),

            // UI State
            dashMode: 'sales',
            dateFilter: 'monthly',
            currentPage: 'dashboard'
        };

        // Map property names to DB Keys for auto-saving
        this._keyMap = {
            sales: DB_KEYS.SALES,
            purchases: DB_KEYS.PURCHASE,
            users: DB_KEYS.USERS,
            traders: DB_KEYS.TRADERS,
            thresholds: DB_KEYS.THRESHOLDS,
            passRequests: DB_KEYS.PASS_REQS,
            signupRequests: DB_KEYS.SIGNUP_REQS,
            catalogSales: DB_KEYS.CATALOG_SALES,
            catalogPurchase: DB_KEYS.CATALOG_PURCHASE,
            catalog: DB_KEYS.CATALOG
        };

        // Return a Proxy to intercept all get/set operations
        return new Proxy(this, {
            get(target, prop) {
                // If the property exists in our data, return it
                if (prop in target._data) return target._data[prop];
                // Otherwise check if it's a method on the class
                return target[prop];
            },
            set(target, prop, value) {
                // Update internal data
                target._data[prop] = value;

                // If it's a persisted property, save to local storage
                if (target._keyMap[prop]) {
                    target.save(target._keyMap[prop], value);
                }
                return true;
            }
        });
    }

    load(key, defaultVal) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : defaultVal;
        } catch (e) {
            console.error(`Error loading key ${key}`, e);
            // If we can't load, we risk overwriting data with defaults. 
            // Alerting here might be annoying on boot if it's just a minor corruption, 
            // but for "Database" issues it's critical.
            if (typeof showAlert === 'function') {
                // Defer alert to ensure UI is ready or use console
                console.error("CRITICAL: DATA LOAD FAILED for " + key);
            }
            return defaultVal;
        }
    }

    save(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error(`Error saving key ${key}`, e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                if (typeof showAlert === 'function') showAlert("Storage Full! Cannot save data. Please export backup and clear data.", "Database Error", "error");
                else alert("Storage Full! Cannot save data.");
            } else {
                console.error("Save failed: ", e);
            }
        }
    }

    // --- ACTIONS ---

    getCatalog(type) {
        return (type === 'buy' || (type === undefined && this._data.dashMode === 'buy'))
            ? this._data.catalogPurchase
            : this._data.catalogSales;
    }

    saveCatalog(type) {
        const isBuy = (type === 'buy' || (type === undefined && this._data.dashMode === 'buy'));
        // Trigger the Proxy setter by re-assigning the object reference (or deep clone if needed, but here simple trigger)
        if (isBuy) this.catalogPurchase = { ...this._data.catalogPurchase };
        else this.catalogSales = { ...this._data.catalogSales };
    }

    getTransactions(type) {
        return (type === 'buy' || (type === undefined && this._data.dashMode === 'buy'))
            ? this._data.purchases
            : this._data.sales;
    }

    getAllTx() {
        return [
            ...this._data.sales.map(t => ({ ...t, type: t.type || 'sell' })),
            ...this._data.purchases.map(t => ({ ...t, type: t.type || 'buy' }))
        ];
    }

    // --- DATA MUTATORS ---
    addTransaction(tx) {
        if (tx.type === 'sell') {
            this._data.sales.push(tx);
            this.save(DB_KEYS.SALES, this._data.sales);
        } else {
            this._data.purchases.push(tx);
            this.save(DB_KEYS.PURCHASE, this._data.purchases);
        }
    }

    updateTransaction(tx) {
        // Remove from both to ensure type changes are handled (e.g., sell -> buy, rare but possible)
        this.deleteTransaction(tx.id);
        this.addTransaction(tx);
    }

    deleteTransaction(id) {
        let changedSales = false;
        let changedPurchases = false;

        const sIdx = this._data.sales.findIndex(t => t.id == id);
        if (sIdx !== -1) {
            this._data.sales.splice(sIdx, 1);
            changedSales = true;
        }

        const pIdx = this._data.purchases.findIndex(t => t.id == id);
        if (pIdx !== -1) {
            this._data.purchases.splice(pIdx, 1);
            changedPurchases = true;
        }

        if (changedSales) this.save(DB_KEYS.SALES, this._data.sales);
        if (changedPurchases) this.save(DB_KEYS.PURCHASE, this._data.purchases);
    }

    // --- TRADER MUTATORS ---
    addTrader(name, data) {
        this._data.traders[name] = data;
        this.save(DB_KEYS.TRADERS, this._data.traders);
    }

    removeTrader(name) {
        if (this._data.traders[name]) {
            delete this._data.traders[name];
            this.save(DB_KEYS.TRADERS, this._data.traders);
        }
    }

    renameTrader(oldName, newName, data) {
        if (this._data.traders[oldName]) {
            delete this._data.traders[oldName];
            this._data.traders[newName] = data;

            // Cascading rename in transactions
            this._data.sales.forEach(t => { if (t.name === oldName) t.name = newName; });
            this._data.purchases.forEach(t => { if (t.name === oldName) t.name = newName; });

            this.save(DB_KEYS.TRADERS, this._data.traders);
            this.save(DB_KEYS.SALES, this._data.sales);
            this.save(DB_KEYS.PURCHASE, this._data.purchases);
        }
    }

    // --- CATALOG MUTATORS ---
    addCatalogItem(type, product, sizeObj) {
        const cat = this.getCatalog(type);
        if (!cat[product]) cat[product] = [];
        cat[product].push(sizeObj);
        this.saveCatalog(type);
    }

    removeCatalogItem(type, product, sizeName) {
        const cat = this.getCatalog(type);
        if (cat[product]) {
            cat[product] = cat[product].filter(s => s.size !== sizeName);
            if (cat[product].length === 0) delete cat[product];
            this.saveCatalog(type);
        }
    }

    updateCatalogItem(type, product, sizeName, newPrice) {
        const cat = this.getCatalog(type);
        if (cat[product]) {
            const item = cat[product].find(s => s.size === sizeName);
            if (item) {
                item.price = newPrice;
                this.saveCatalog(type);
            }
        }
    }
    // --- STOCK MUTATORS ---
    calculateStock(prod, size) {
        let total = 0;
        this.getAllTx().forEach(t => {
            if (t.product === prod && t.size === size) {
                if (t.type === 'buy') total += Number(t.qty);
                if (t.type === 'sell') total -= Number(t.qty);
            }
        });
        return total;
    }

    // Optimized: Calculate all stock in one pass O(N) instead of O(N*M)
    getInventoryMap() {
        const map = {};
        this.getAllTx().forEach(t => {
            const key = `${t.product}-${t.size}`;
            if (!map[key]) map[key] = 0;

            if (t.type === 'buy') map[key] += Number(t.qty);
            else map[key] -= Number(t.qty);
        });
        return map;
    }

    // --- USER MUTATORS ---
    addUser(userObj) {
        this._data.users = [...this._data.users, userObj];
        this.save(DB_KEYS.USERS, this._data.users);
    }

    removeUser(username) {
        this._data.users = this._data.users.filter(u => u.user !== username);
        this.save(DB_KEYS.USERS, this._data.users);
    }

    updateUser(username, newProps) {
        const idx = this._data.users.findIndex(u => u.user === username);
        if (idx !== -1) {
            this._data.users[idx] = { ...this._data.users[idx], ...newProps };
            this.save(DB_KEYS.USERS, this._data.users);
        }
    }

    // --- REQUEST MUTATORS ---
    addSignupRequest(req) {
        this._data.signupRequests = [...this._data.signupRequests, req];
        this.save(DB_KEYS.SIGNUP_REQS, this._data.signupRequests);
    }

    removeSignupRequest(username) {
        this._data.signupRequests = this._data.signupRequests.filter(r => r.user !== username);
        this.save(DB_KEYS.SIGNUP_REQS, this._data.signupRequests);
    }

    addPassRequest(req) {
        this._data.passRequests = [...this._data.passRequests, req];
        this.save(DB_KEYS.PASS_REQS, this._data.passRequests);
    }

    removePassRequest(username) {
        this._data.passRequests = this._data.passRequests.filter(r => r.user !== username);
        this.save(DB_KEYS.PASS_REQS, this._data.passRequests);
    }
}


// Global Singleton Instance
const state = new Store();
