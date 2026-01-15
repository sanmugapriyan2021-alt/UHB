"use strict";
// Mobile Touch Handling
let touchstartX = 0;
let touchstartY = 0;
let touchendX = 0;
let touchendY = 0;

document.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    touchendY = e.changedTouches[0].screenY;
    handleGesture();
}, { passive: true });

function handleGesture() {
    const xDiff = touchendX - touchstartX;
    const yDiff = touchendY - touchstartY;

    // Horizontal Swipe
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        // Right Swipe (Open Sidebar) - Only if started near left edge
        if (xDiff > 50 && touchstartX < 50) {
            openSidebar();
        }

        // Left Swipe (Close Sidebar)
        if (xDiff < -50 && document.getElementById('main-sidebar').classList.contains('mobile-open')) {
            closeSidebar();
        }
    }
}

function openSidebar() {
    document.getElementById('main-sidebar').classList.add('mobile-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeSidebar() {
    document.getElementById('main-sidebar').classList.remove('mobile-open');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
}

const navState = {
    current: 'dashboard',
    history: []
};
// --- UI HELPERS ---
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'warning') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function checkPerm(perm, defaultAllowed = false) {
    if (!auth.currentUser) return false;
    // Check for Technical Team
    if (auth.currentUser.role === 'Technical Team') return true;
    // Owner is handled via 'Technical Team' role or specific permissions usually, 
    // but the system default 'Owner' role also has all perms set by default in auth.js defaults
    // In auth.js: applyAuth logic says isTechTeam || perms...
    // Let's stick to checking permissions object which is populated in auth.applyAuth
    const p = auth.currentUser.permissions || {};
    if (p[perm] !== undefined) return p[perm];
    return defaultAllowed;
}

// --- OPTIMIZED RENDERING ---
const debouncedRenderSales = tools.debounce(() => renderSalesTable(), 300);
const debouncedRenderDash = tools.debounce(() => renderDashboard(), 300);

function renderAll() {
    updateFormDropdowns();

    switch (state.currentPage) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'sales':
            renderSalesTable();
            break;
        case 'inventory':
            renderInventory();
            break;
        case 'customers':
            renderCustomers();
            break;
        case 'settings':
            break;
        default:
            break;
    }
}

// --- DASHBOARD RENDERING ---
function renderDashboard() {
    // Determine active filter (responsive)
    const desktopFilter = document.getElementById('date-filter-desktop');
    const mobileFilter = document.getElementById('date-filter-mobile');

    let filterVal = 'monthly';

    // Sync logic: whichever is visible/active drives the state
    if (window.innerWidth <= 768 && mobileFilter) {
        filterVal = mobileFilter.value;
        if (desktopFilter) desktopFilter.value = filterVal;
    } else if (desktopFilter) {
        filterVal = desktopFilter.value;
        if (mobileFilter) mobileFilter.value = filterVal;
    }

    state.dateFilter = filterVal;

    const txList = state.getAllTx(); // Get all tx
    const now = new Date(); // Start fresh

    // 1. FILTER DATA
    const filteredTx = txList.filter(t => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (state.dateFilter === 'daily') {
            return d.getTime() === today.getTime();
        }
        if (state.dateFilter === 'weekly') {
            const temp = new Date();
            temp.setDate(today.getDate() - 7);
            return d >= temp;
        }
        if (state.dateFilter === 'monthly') {
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }
        if (state.dateFilter === '6months') {
            const temp = new Date();
            temp.setMonth(today.getMonth() - 6);
            return d >= temp;
        }
        if (state.dateFilter === '1year') {
            const temp = new Date();
            temp.setFullYear(today.getFullYear() - 1);
            return d >= temp;
        }
        return true;
    });

    // 2. UPDATE STATS UI
    const modeColor = getComputedStyle(document.body).getPropertyValue('--primary').trim();
    const modeLabel = state.dashMode === 'buy' ? 'Purchases' : 'Sales';

    const lblTotal = document.getElementById('val-total-label');
    if (lblTotal) {
        lblTotal.innerText = `Total ${modeLabel} (Monthly)`;
        lblTotal.style.color = modeColor;
    }

    const iconTotal = document.getElementById('val-total-icon');
    if (iconTotal) iconTotal.style.color = modeColor;

    const iconStock = document.getElementById('val-stock-icon');
    if (iconStock) iconStock.style.color = modeColor;

    // Card 1: Count
    document.getElementById('val-total').innerText = filteredTx.length;

    // Card 2: Revenue
    const totalAmount = filteredTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const estValEl = document.getElementById('val-stock-est');
    if (estValEl) {
        estValEl.innerText = "\u20B9" + totalAmount.toLocaleString();

        const card2 = estValEl.closest('.card');
        if (card2) {
            const lbl = card2.querySelector('.stat-label');
            if (lbl) lbl.innerText = `Total ${state.dashMode === 'buy' ? 'Expense' : 'Revenue'} (${state.dateFilter})`;

            const footer = card2.querySelector('.trend-up');
            if (footer) {
                footer.innerHTML = `<i class="fas fa-coins" id="val-stock-icon"></i> Filtered Total`;
                const icon = footer.querySelector('i');
                if (icon) icon.style.color = modeColor;
            }
        }
    }

    // 3. CHARTS
    const ctxLine = document.getElementById('mainChart').getContext('2d');
    const dateMap = {};

    // Sort and Aggregate for Line Chart
    const sortedTx = [...filteredTx].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedTx.forEach(t => {
        dateMap[t.date] = (dateMap[t.date] || 0) + 1;
    });

    const labels = [...new Set(sortedTx.map(t => t.date))];
    const data = labels.map(date => {
        return sortedTx.filter(t => t.date === date).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    if (window.myLine) window.myLine.destroy();

    const style = getComputedStyle(document.body);
    const primaryColor = style.getPropertyValue('--primary').trim();
    const primaryRgb = style.getPropertyValue('--primary-rgb').trim();

    window.myLine = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: state.dashMode === 'buy' ? 'Purchases (\u20B9)' : 'Sales (\u20B9)',
                data: data,
                borderColor: primaryColor,
                backgroundColor: `rgba(${primaryRgb}, 0.1)`,
                pointBackgroundColor: primaryColor,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Pie Chart
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    const prodMap = {};
    filteredTx.forEach(t => {
        prodMap[t.product] = (prodMap[t.product] || 0) + (Number(t.amount) || 0);
    });

    if (window.myPie) window.myPie.destroy();

    const pieColors = state.dashMode === 'buy' ?
        ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'] :
        ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

    window.myPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: Object.keys(prodMap),
            datasets: [{
                data: Object.values(prodMap),
                backgroundColor: pieColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });

    // 4. RECENT TABLE
    const tableBody = document.getElementById('recent-table-body');
    if (tableBody) {
        tableBody.innerHTML = filteredTx.slice(0, 5).map(t => {
            const tr = state.traders[t.name];
            const contact = (tr && typeof tr === 'object') ? tr.contact : (tr || 'N/A');
            return `
                <tr>
                    <td>${t.date}</td>
                    <td><span class="badge ${t.type === 'sell' ? 'badge-sell' : 'badge-buy'}">${t.type.toUpperCase()}</span></td>
                    <td>${t.name}</td>
                    <td><div class="mobile-hide">${contact}</div></td>
                    <td>${t.product}</td>
                    <td>${t.qty}</td>
                    <td style="font-weight:700;">\u20B9${(Number(t.amount) || 0).toLocaleString()}</td>
                    <td><span class="badge ${t.status === 'purchased' ? 'badge-buy' : 'badge-info'}">${(t.status || 'purchased').toUpperCase()}</span></td>
                </tr>
            `;
        }).join('');
    }

    // 5. REMINDERS
    renderReminders();
}

// --- CUSTOM MODAL HELPERS ---
let confirmCallback = null;

let alertCallback = null;
let currentPrintFormat = 'bill';

function showAlert(msg, title = "Notice", type = "info", callback = null) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-msg').innerText = msg;

    const iconBox = document.getElementById('alert-icon');
    if (type === 'error') {
        iconBox.style.color = 'var(--danger)';
        iconBox.innerHTML = '<i class="fas fa-times-circle"></i>';
    } else if (type === 'success') {
        iconBox.style.color = '#10b981';
        iconBox.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else {
        iconBox.style.color = 'var(--primary)';
        iconBox.innerHTML = '<i class="fas fa-info-circle"></i>';
    }

    document.getElementById('customAlertModal').style.display = 'flex';
    alertCallback = callback;
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
    if (alertCallback) {
        alertCallback();
        alertCallback = null;
    }
}



function closeConfirm() {
    document.getElementById('customConfirmModal').style.display = 'none';
}

function confirmAction() {
    const inputFn = document.getElementById('confirm-input');
    const val = inputFn.value;
    if (confirmCallback) confirmCallback(val);
    closeConfirm();
}

function showConfirm(msg, callback, title = "Confirm Action", showInput = false, defaultInput = "") {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-msg').innerText = msg;
    confirmCallback = callback;

    const inputContainer = document.getElementById('confirm-input-container');
    const inputField = document.getElementById('confirm-input');

    if (showInput) {
        inputContainer.style.display = 'block';
        inputField.value = defaultInput;
        inputField.focus();
    } else {
        inputContainer.style.display = 'none';
    }

    document.getElementById('customConfirmModal').style.display = 'flex';
}

document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    const inputVal = document.getElementById('confirm-input').value;
    if (confirmCallback) confirmCallback(inputVal);
    document.getElementById('customConfirmModal').style.display = 'none';
});

document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    document.getElementById('customConfirmModal').style.display = 'none';
});


// --- SETTINGS & DATA MANAGEMENT ---
function exportDB() {
    if (!checkPerm('backup')) return showToast("Permission Denied: Backup access required", "error");

    const data = {};
    Object.values(DB_KEYS).forEach(key => {
        const val = localStorage.getItem(key);
        if (val) data[key] = val;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UHB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); // Required for some browsers
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up memory
    showToast("Backup exported successfully!");
}

function importDB(input) {
    if (!checkPerm('backup')) return showToast("Permission Denied: Restore access required", "error");

    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            showConfirm("This will overwrite all current data. Are you sure?", () => {
                // Clear existing UDT keys before restore to ensure a clean state
                Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));

                Object.entries(data).forEach(([key, value]) => {
                    if (value) localStorage.setItem(key, value);
                });
                showToast("Data restored! Reloading...");
                setTimeout(() => location.reload(), 1500);
            }, "Restore Database");

        } catch (err) {
            showToast("Invalid backup file", "error");
        }
    };
    reader.readAsText(file);
    input.value = ''; // Reset input to allow re-uploading the same file
}

function resetDB() {
    if (!checkPerm('backup')) return showToast("Technical Team Access Required!", "error"); // Reset is restricted
    // Original was: if (auth.currentUser?.role !== 'Master')
    if (auth.currentUser?.role !== 'Technical Team') return showToast("Technical Team Access Required!", "error");
    showConfirm("CRITICAL WARNING: This will PERMANENTLY delete all transactions, customers, and catalog data. Proceed only if you have a backup. Continue?", () => {
        // Double Confirm
        showConfirm("LAST CHANCE: Are you absolutely sure? This cannot be undone.", () => {
            Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));
            showToast("Database Reset! Reloading...");
            setTimeout(() => location.reload(), 1500);
        }, "CONFIRM WIPE");
    }, "Factory Reset");
}

function changeTechTeamPass() {
    const newPass = document.getElementById('new-master-pass').value.trim();
    if (!newPass) return showToast("Password cannot be empty", "error");

    showConfirm("Change Technical Team Password? You will be logged out.", () => {
        // In this V2 implementation, we'll store the master pass in localStorage if it's changed
        localStorage.setItem('udt_master_pass_v2', newPass);
        showToast("Password updated! Logging out...");
        setTimeout(() => auth.logout(), 1500);
    }, "Update Security");
}

// --- CATALOG MANAGEMENT ---
function openCatalogModal() {
    document.getElementById('catalogModal').style.display = 'flex';
    // Auto-select mode based on Dashboard context
    const mode = (state.dashMode === 'buy') ? 'buy' : 'sales';
    catalog.setMgrMode(mode);
}

function setDashMode(mode) {
    try {
        state.dashMode = mode;

        // UI Update - Global Header Toggles
        const btnSales = document.getElementById('btn-mode-sales');
        const btnBuy = document.getElementById('btn-mode-buy');

        if (btnSales && btnBuy) {
            if (mode === 'sales') {
                btnSales.style.background = 'white';
                btnSales.style.color = 'var(--primary)';
                btnSales.style.boxShadow = '0 2px 8px var(--shadow-color)';
                btnBuy.style.background = 'transparent';
                btnBuy.style.color = '#94a3b8';
                btnBuy.style.boxShadow = 'none';
            } else {
                btnBuy.style.background = 'white';
                btnBuy.style.color = 'var(--primary)';
                btnBuy.style.boxShadow = '0 2px 8px var(--shadow-color)';
                btnSales.style.background = 'transparent';
                btnSales.style.color = '#94a3b8';
                btnSales.style.boxShadow = 'none';
            }
        }

        // Re-render current page to apply mode-specific styles
        nav(state.currentPage);
    } catch (e) {
        console.error("setDashMode error:", e);
        // showToast("Error switching mode", "error");
    }
}

function openModalWithMode() {
    const defaultType = state.dashMode === 'buy' ? 'buy' : 'sell';

    // Set dynamic title and hidden type field
    document.getElementById('tx-title').innerText = defaultType === 'sell' ? 'Sales Entry' : 'Purchase Entry';
    document.getElementById('t-type').value = defaultType;

    // Dynamic Label: Customer vs Dealer
    const label = document.getElementById('t-customer-label');
    if (label) {
        label.innerText = defaultType === 'buy' ? 'Dealer *' : 'Customer *';
    }

    // Reset Form for New Entry
    const form = document.getElementById('txForm');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('t-date').valueAsDate = new Date();
    document.getElementById('t-amount').value = "";
    document.getElementById('t-status').value = "purchased";

    updateFormDropdowns();
    toggleSettlementFields();
    openModal(); // Standard open
}

// --- DASHBOARD ---
// (Function moved to earlier block)

function renderReminders() {
    const today = new Date().toISOString().split('T')[0];
    // Check both datasets for reminders
    const reminders = [...state.sales, ...state.purchases].filter(t =>
        t.status === 'booked' && t.promiseDate === today
    );

    const card = document.getElementById('reminders-card');
    const list = document.getElementById('reminder-list');
    const count = document.getElementById('reminder-count');

    if (reminders.length > 0) {
        card.style.display = 'block';
        count.innerText = reminders.length;
        list.innerHTML = reminders.map(t => {
            const balance = (Number(t.amount) || 0) - (Number(t.paidAmount) || 0);
            // Gate Pay button: Technical Team or perms.edit
            const canEdit = checkPerm('edit');
            const payBtn = canEdit ? `<button onclick="editTx(${t.id})" style="background:var(--accent); color:white; border:none; padding:2px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">Pay</button>` : '';

            return `
                <div style="background:white; padding:10px 15px; border-radius:10px; border:1px solid #fed7aa; display:flex; flex-direction:column; gap:4px; min-width:200px;">
                    <div style="font-weight:700; color:var(--dark); font-size:0.85rem;">${t.name}</div>
                    <div style="font-size:0.75rem; color:#64748B;">${t.product} (${t.size})</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                        <span style="font-size:0.8rem; font-weight:700; color:var(--accent);">Due: \u20B9${balance.toLocaleString()}</span>
                        ${payBtn}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        card.style.display = 'none';
    }
}

function updateValuation() {
    // Valuation Stock logic
    // Fix: state.calculateStock() returns a number (0) if no args, not a map.
    // We must iterate the catalog to calculate total value.
    const activeCatalog = state.getCatalog();
    let totalVal = 0;

    if (activeCatalog) {
        Object.entries(activeCatalog).forEach(([prod, items]) => {
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const qty = state.calculateStock(prod, item.size);
                    if (qty > 0) {
                        totalVal += (qty * (Number(item.price) || 0));
                    }
                });
            }
        });
    }

    const el = document.getElementById('val-stock-est');
    if (el) el.innerText = "\u20B9" + totalVal.toLocaleString();
}


// --- INVENTORY LOGIC ---


function renderInventory() {
    const container = document.getElementById('inventory-grid');
    if (!container) return; // Matches the element ID used in HTML

    const catalog = state.getCatalog();
    let html = '';
    let hasAlert = false;

    Object.entries(catalog).forEach(([prod, variants]) => {
        if (!Array.isArray(variants)) return;

        variants.forEach(v => {
            const stock = state.calculateStock(prod, v.size);
            const isLow = stock < 50; // Simple threshold for visual alert
            if (isLow) hasAlert = true;

            // Square Card Layout (Simplified)
            // Removed inline 'Set Limit' to keep it clean and square as requested.
            html += `
                <div class="card inventory-card" onclick="openLedger('${prod}', '${v.size}')">
                    <div style="font-weight:700; font-size:1.1rem; color:var(--dark); margin-top:8px;">${prod}</div>
                    
                    <div style="font-size:3rem; font-weight:800; color:${isLow ? 'var(--danger)' : 'var(--primary)'}; 
                        font-family:'Rajdhani', sans-serif;">
                        ${stock}
                    </div>
                    
                    <div style="font-weight:600; color:#64748B; background:#F1F5F9; padding:4px 12px; border-radius:8px; font-size:0.9rem;">
                        ${v.size}
                    </div>
                </div>
            `;
        });
    });

    if (html === '') {
        html = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #94A3B8;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <div style="font-size: 1.1rem; font-weight: 600;">Inventory is Empty</div>
                <div style="font-size: 0.9rem;">Add products via Catalog/Settings to get started.</div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Add New Product Placeholder Card (Technical Team or Limit Permission)
    if (checkPerm('limits')) {
        container.innerHTML += `
            <div class="card inventory-card" onclick="openCatalogModal()" 
                style="border:2px dashed #E2E8F0; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background:rgba(248, 250, 252, 0.5); min-height:180px; transition:0.3s;">
                <i class="fas fa-plus-circle" style="font-size:2rem; color:#94A3B8; margin-bottom:12px;"></i>
                <div style="font-weight:700; color:#475569;">Add New Product</div>
            </div>
        `;
    }

    // Update global alert dot if needed (assuming element exists outside)
    const alertDot = document.getElementById('inv-alert-dot');
    if (alertDot) alertDot.style.display = hasAlert ? 'block' : 'none';
}

function openLedger(prod, size) {
    document.getElementById('ledger-title-prod').innerText = prod;
    document.getElementById('ledger-title-size').innerText = size;

    const history = state.getAllTx()
        .filter(t => t.product === prod && t.size === size)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningStock = 0;
    const body = document.getElementById('ledger-body');
    body.innerHTML = history.map(t => {
        if (t.type === 'buy') runningStock += Number(t.qty);
        else runningStock -= Number(t.qty);

        return `
            <tr>
                <td>${t.date}</td>
                <td><span class="badge ${t.type === 'sell' ? 'badge-sell' : 'badge-buy'}">${t.type.toUpperCase()}</span></td>
                <td>${t.name}</td>
                <td style="font-weight:700; color:${t.type === 'buy' ? '#059669' : 'var(--primary)'}">${t.type === 'buy' ? '+' : '-'}${t.qty}</td>
                <td style="font-weight:700;">${runningStock}</td>
            </tr>
        `;
    }).reverse().join(''); // Show latest on top

    if (history.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94A3B8;">No transaction history for this item.</td></tr>';
    }

    document.getElementById('ledgerModal').style.display = 'flex';
}

function setLimit(prod, size) {
    if (!checkPerm('limits')) return showToast("Permission Denied: Stock Limit access required", "error");

    showConfirm(`Set low stock warning limit for ${prod}(${size}): `, (val) => {
        if (val !== null) {
            const lim = parseInt(val);
            if (!isNaN(lim)) {
                state.thresholds[`${prod}-${size}`] = lim;
                localStorage.setItem(DB_KEYS.THRESHOLDS, JSON.stringify(state.thresholds));
                renderInventory();
            } else {
                showToast("Invalid number entered", "error");
            }
        }
    }, "Set Stock Limit", true, "50");
}

// --- CUSTOMER LOGIC ---
function renderCustomers() {
    const body = document.getElementById('customer-table-body');
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    const isTechTeam = auth.currentUser && auth.currentUser.role === 'Technical Team';

    let html = '';
    const currentMode = state.dashMode || 'sales'; // 'sales' or 'buy'

    Object.entries(state.traders).forEach(([name, data]) => {
        const contact = (typeof data === 'object') ? data.contact : (data || 'N/A');
        const type = (typeof data === 'object') ? data.type : (state.getAllTx().some(t => t.name === name && t.type === 'buy') ? 'Dealer' : 'Customer');

        // Filter Logic: Sales -> Customer, Buy -> Dealer
        const targetType = currentMode === 'buy' ? 'Dealer' : 'Customer';
        if (type !== targetType) return;

        const typeLabel = type === 'Dealer' ? '<span style="color:var(--secondary);">Dealer</span>' : 'Customer';

        html += `
            <tr onclick="openCustPortal('${name}')" style="cursor:pointer;">
                <td><b>${name}</b></td>
                <td>${contact}</td>
                <td>${typeLabel}</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:10px;">
                        ${checkPerm('edit') ? `<button style="color:var(--secondary); border:none; background:none; cursor:pointer;" onclick="event.stopPropagation(); editCust('${name}')"><i class="fas fa-edit"></i></button>` : ''}
                        ${checkPerm('delete') ? `<button style="color:var(--danger); border:none; background:none; cursor:pointer;" onclick="event.stopPropagation(); deleteCust('${name}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    if (!html) {
        html = `<tr><td colspan="4" style="text-align:center; padding:60px; color:#94A3B8;">
                    <i class="fas fa-users-slash" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <div style="font-weight:600;">No ${currentMode === 'buy' ? 'Dealers' : 'Customers'} Found</div>
                    <div style="font-size:0.85rem;">Add a new ${currentMode === 'buy' ? 'dealer' : 'customer'} to manage contacts.</div>
                </td></tr>`;
    }

    body.innerHTML = html;
}

function openCustPortal(name) {
    const data = state.traders[name];
    const contact = (typeof data === 'object') ? data.contact : (data || 'No contact');
    const history = state.getAllTx().filter(t => t.name === name);

    document.getElementById('portal-cust-name').innerText = name;
    document.getElementById('portal-cust-contact').innerText = contact;

    document.getElementById('portal-total-orders').innerText = history.length;
    document.getElementById('portal-stock-in').innerText = history.filter(t => t.type === 'buy').length;

    // Total Balance (Total Sell Amt - Total Buy Amt)
    let bal = 0;
    history.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'sell') bal += amt;
        else bal -= amt;
    });
    document.getElementById('portal-balance').innerText = "\u20B9" + bal.toLocaleString();

    const body = document.getElementById('portal-history-body');
    body.innerHTML = history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => `
        <tr>
            <td>${t.date}</td>
            <td>${t.product}</td>
            <td><span class="badge badge-mode">${(t.status || 'purchased').toUpperCase()}</span></td>
            <td><span class="badge ${t.type === 'sell' ? 'badge-sell' : 'badge-buy'}">${t.type.toUpperCase()}</span></td>
            <td>${t.qty}</td>
            <td style="font-weight:700;">\u20B9${(Number(t.amount) || 0).toLocaleString()}</td>
            <td style="text-align:right;">
                 <div style="display:inline-flex; gap:10px; align-items:center; justify-content:flex-end;">
                    <button style="color:var(--primary); border:none; background:none; cursor:pointer; padding:5px; font-size:1rem;" onclick="event.stopPropagation(); printReceipt('${t.id}')" title="Print Receipt"><i class="fas fa-print"></i></button>
                    <button style="color:var(--danger); border:none; background:none; cursor:pointer; padding:5px; font-size:1rem;" onclick="event.stopPropagation(); deleteTx('${t.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');

    document.getElementById('custPortalModal').style.display = 'flex';
}

function deleteCust(name) {
    if (!checkPerm('delete')) return showToast("Permission Denied: Delete access required", "error");

    showConfirm(`Delete ${name} from database ? `, () => {
        state.removeTrader(name);
        renderAll();
        showToast("Customer Deleted");
    }, "Delete Customer");
}

function editCust(name) {
    if (!checkPerm('edit')) return showToast("Permission Denied: Edit access required", "error");

    const data = state.traders[name];
    const contact = (typeof data === 'object') ? data.contact : (data || 'N/A');
    const type = (typeof data === 'object') ? data.type : (state.getAllTx().some(t => t.name === name && t.type === 'buy') ? 'Dealer' : 'Customer');

    document.getElementById('c-name').value = name;
    document.getElementById('c-contact').value = contact;
    document.getElementById('c-type').value = type;
    document.getElementById('custForm').dataset.editName = name; // Store original name
    openCustModal();
}

function openCustModal() {
    const form = document.getElementById('custForm');
    if (!form.dataset.editName) {
        form.reset();
        document.getElementById('c-name').value = '';
        document.getElementById('c-contact').value = '';
        document.getElementById('c-type').value = 'Customer';
    }
    document.getElementById('custModal').style.display = 'flex';
}
function openUserModal() {
    document.getElementById('userModal').style.display = 'flex';
    auth.renderUserList();
}

document.getElementById('custForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('c-name').value.trim();
    const contact = document.getElementById('c-contact').value.trim();
    const type = document.getElementById('c-type').value;
    const editName = e.target.dataset.editName;

    if (name) {
        // Check for duplicates if it's a new name or rename
        if ((!editName || editName !== name) && state.traders[name]) {
            return showToast("Customer already exists with this name!", "warning");
        }

        if (editName && editName !== name) {
            // It's a rename - delete old, update transactions in both sets
            state.renameTrader(editName, name, { contact: contact || 'N/A', type: type });
        } else {
            // New or Update existing (same name)
            state.addTrader(name, { contact: contact || 'N/A', type: type });
        }

        showToast(isUpdate ? "Customer Updated!" : "Customer Added!");
        closeModal('custModal');
        delete e.target.dataset.editName;
        renderAll();
    }
});

// --- REPORTS ---
function generateReport(type) {
    let csv = [];
    let filename = '';

    if (type === 'sales') {
        csv = [['Date', 'Type', 'Customer', 'Product', 'Size', 'Qty', 'Amount', 'Status']];

        // Use filtered data if we are in the Sales view, otherwise all
        const isSalesView = document.getElementById('view-sales').style.display === 'block';
        let dataToExport = state.getTransactions();

        if (isSalesView) {
            const fDate = document.getElementById('f-date').value;
            const fName = document.getElementById('f-name') ? document.getElementById('f-name').value.toLowerCase() : '';
            const fProd = document.getElementById('f-prod') ? document.getElementById('f-prod').value : 'all';
            const fSize = document.getElementById('f-size') ? document.getElementById('f-size').value.toLowerCase() : '';
            const fStatus = document.getElementById('f-status') ? document.getElementById('f-status').value : 'all';

            dataToExport = state.getTransactions().filter(t => {
                if (fDate && t.date !== fDate) return false;
                if (fName && !t.name.toLowerCase().includes(fName)) return false;
                if (fProd !== 'all' && t.product !== fProd) return false;
                if (fSize && !t.size.toLowerCase().includes(fSize)) return false;
                if (fStatus !== 'all' && (t.status || 'purchased') !== fStatus) return false;
                return true;
            });
        }

        dataToExport.forEach(t => csv.push([t.date, t.type, t.name, t.product, t.size, t.amount || 0, t.status || 'purchased']));
        filename = isSalesView ? 'Filtered_Sales_Report.csv' : 'Full_Sales_Report.csv';
    } else if (type === 'stock') {
        csv = [['Product', 'Size', 'Current Stock']];
        const activeCatalog = state.getCatalog();
        Object.entries(activeCatalog).forEach(([prod, variants]) => {
            variants.forEach(v => csv.push([prod, v.size, state.calculateStock(prod, v.size)]));
        });
        filename = `${state.dashMode.toUpperCase()} _Inventory_Report.csv`;
    } else if (type === 'customers') {
        csv = [['Name', 'Contact']];
        Object.entries(state.traders).forEach(([n, c]) => csv.push([n, c]));
        filename = 'Customer_List.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," + csv.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = filename;
    link.click();
}

// --- CORE UI ---
// --- CORE UI ---
function nav(pageId) {
    // Security Check: If no user is logged in, show login overlay
    if (!auth.currentUser) {
        document.getElementById('login-overlay').style.display = 'flex';
        return;
    }
    // Determine active page
    let activePage = pageId;
    if (pageId === 'dashboard') {
        const mode = document.body.classList.contains('mode-buy') ? 'buy' : 'sales';
        // Dashboard is default
    }

    // Hide all views
    document.querySelectorAll('[id^="view-"]').forEach(el => {
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
    });

    // Show target view
    const target = document.getElementById('view-' + pageId);
    if (target) {
        target.style.display = 'block';
        // Trigger reflow
        void target.offsetWidth;
        target.style.opacity = '1';
        target.style.transform = 'translateY(0)';
    }

    // Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Desktop Sidebar
    document.querySelectorAll(`.nav-item[onclick="nav('${pageId}')"]`).forEach(el => el.classList.add('active'));

    // Mobile Bottom Nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active')); // clear all
    const mobNav = document.getElementById('mob-nav-' + pageId);
    if (mobNav) mobNav.classList.add('active');

    // Update Title
    const titles = {
        'dashboard': 'Home Overview',
        'sales': 'Transactions Log',
        'inventory': 'Stock Inventory',
        'customers': 'Customer Database',
        'reports': 'Reports & Analytics',
        'settings': 'Application Settings'
    };
    document.getElementById('page-title').innerText = titles[pageId] || 'Dashboard';

    // Toggle specific header controls
    const dateFilter = document.getElementById('dash-date-filter');
    const calBtn = document.getElementById('header-cal-btn');

    if (pageId === 'dashboard') {
        if (dateFilter) dateFilter.style.display = 'block';
        if (calBtn) calBtn.style.display = 'block';
        renderDashboard();
    } else {
        if (dateFilter) dateFilter.style.display = 'none';
        if (calBtn) calBtn.style.display = 'none';
    }

    // Special renders
    if (pageId === 'sales') renderSalesTable();
    if (pageId === 'inventory') renderInventory();
    if (pageId === 'customers') renderCustomers();

    navState.current = pageId;

    // Mobile: Auto-close sidebar on selection
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function renderSalesTable() {
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    const isTechTeam = auth.currentUser && auth.currentUser.role === 'Technical Team';

    // Collect all filter values
    const fDate = document.getElementById('f-date') ? document.getElementById('f-date').value : '';
    const fName = document.getElementById('f-name') ? document.getElementById('f-name').value.toLowerCase() : '';
    const fProd = document.getElementById('f-prod') ? document.getElementById('f-prod').value : 'all';
    const fSize = document.getElementById('f-size') ? document.getElementById('f-size').value.toLowerCase() : '';
    const fStatus = document.getElementById('f-status') ? document.getElementById('f-status').value : 'all';

    // Update Product Dropdown options dynamically if empty (except 'all')
    const pSel = document.getElementById('f-prod');
    if (pSel && pSel.options.length <= 1) {
        Object.keys(state.catalog).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.innerText = p;
            pSel.appendChild(opt);
        });
    }

    // Filter logic
    const txList = state.getTransactions();
    const filtered = txList.filter(t => {
        if (fDate && t.date !== fDate) return false;
        if (fName && !(t.name || '').toLowerCase().includes(fName)) return false;
        if (fProd !== 'all' && t.product !== fProd) return false;
        if (fSize && !(t.size || '').toLowerCase().includes(fSize)) return false;
        if (fStatus !== 'all' && (t.status || 'purchased') !== fStatus) return false;
        return true;
    });

    // Sort by Date Descending (Newest First) and Limit to 100
    // User Request: "only 100 recent transaction shud be shown"
    filtered.sort((a, b) => {
        // Try precise ID sort first if available (assuming ID is timestamp based), else Date string
        return (parseInt(b.id) - parseInt(a.id)) || (new Date(b.date) - new Date(a.date));
    });

    const displayList = filtered.slice(0, 100);
    const hiddenCount = filtered.length - displayList.length;

    const body = document.getElementById('sales-body');
    if (displayList.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#94A3B8;">
                    <i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
                    No transactions found matching your filters
                </td></tr>`;
        return;
    }

    let rowsHtml = displayList.map(t => {
        const isBooked = t.status === 'booked';
        const paid = Number(t.paidAmount) || 0;
        const total = Number(t.amount) || 0;
        const balance = total - paid;
        const payProgress = isBooked ? `<div style="font-size:0.7rem; color:#64748B; margin-top:2px;">Paid: \u20B9${paid.toLocaleString('en-IN')} / \u20B9${total.toLocaleString('en-IN')}</div>` : '';

        return `
                <tr>
            <td data-label="Date">${t.date}</td>
            <td data-label="Customer"><b>${t.name}</b></td>
            <td data-label="Product">${t.product}</td>
            <td data-label="Size">${t.size}</td>
            <td data-label="Qty">${t.qty}</td>
            <td data-label="Amount">
                <div style="font-weight:700;">\u20B9${total.toLocaleString('en-IN')}</div>
                <div style="font-size:0.65rem; color:#94A3B8; margin-top:2px;">
                    ${t.paymentMethod || 'Cash'}
                    ${(t.paymentMethod === 'UPI' && t.upiId) ? ` | ID: ${t.upiId}` : ''}
                </div>
                ${payProgress}
            </td>
            <td data-label="Status">
                <span class="badge" style="background:${t.status === 'purchased' ? '#ECFDF5' : (isBooked ? '#FFF7ED' : '#eff6ff')}; 
                    color:${t.status === 'purchased' ? '#059669' : (isBooked ? '#C2410C' : '#3b82f6')}">
                    ${(t.status || 'purchased').toUpperCase()}
                </span>
                ${isBooked && t.promiseDate ? `<div style="font-size:0.65rem; color:#C2410C; margin-top:2px; font-weight:600;">Due: ${t.promiseDate}</div>` : ''}
            </td>
            <td style="text-align:right; white-space:nowrap;" class="actions-cell">
                <div style="display:inline-flex; gap:15px; align-items:center;">
                    <button style="color:var(--primary); border:none; background:none; cursor:pointer; padding:5px; font-size:1.1rem;" onclick="event.stopPropagation(); printReceipt('${t.id}')" title="Print Receipt"><i class="fas fa-print"></i></button>
                    ${checkPerm('edit') ? `<button style="color:var(--secondary); border:none; background:none; cursor:pointer; padding:5px; font-size:1.1rem;" onclick="event.stopPropagation(); editTx('${t.id}')"><i class="fas fa-edit"></i></button>` : ''}
                    <button style="color:var(--danger); border:none; background:none; cursor:pointer; padding:5px; font-size:1.1rem;" onclick="event.stopPropagation(); deleteTx('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
                `}).join('');

    // Append limit warning if needed
    if (hiddenCount > 0) {
        rowsHtml += `<tr><td colspan="8" style="text-align:center; padding:15px; background:#f8fafc; color:#64748B; font-size:0.85rem;">
                    Showing recent 100 entries. <b>${hiddenCount} older records</b> hidden in this view. Use filters to see them.
                </td></tr>`;
    }

    body.innerHTML = rowsHtml;
}

// function editTx(id) ... needs loose equality update if I rely on exact type earlier, 
// but state.sales.find relies on type. 
// Let's update editTx to also use loose equality or just rely on implicit if I removed the Number() casting which I didn't add there yet.
// Checking editTx implementation:
function editTx(id) {
    if (!checkPerm('edit')) return showToast("Permission Denied: Edit access required", "error");

    const txList = [...state.sales, ...state.purchases];
    // Use loose equality
    const t = txList.find(tx => tx.id == id);
    if (!t) return showToast("Transaction not found", "error");

    // Set dynamic title and hidden type field
    document.getElementById('tx-title').innerText = t.type === 'sell' ? 'Edit Sales Entry' : 'Edit Purchase Entry';
    document.getElementById('t-type').value = t.type;

    // Fill Form
    updateFormDropdowns();
    document.getElementById('t-date').value = t.date;
    document.getElementById('t-customer').value = t.name;
    document.getElementById('t-product').value = t.product;
    updateSizeDropdown();
    document.getElementById('t-size').value = t.size;
    document.getElementById('t-qty').value = t.qty;
    document.getElementById('t-amount').value = t.amount || "";
    document.getElementById('t-status').value = t.status || "purchased";
    document.getElementById('t-payment').value = t.paymentMethod || "Cash";
    document.getElementById('t-upi-id').value = t.upiId || "";
    document.getElementById('t-paid').value = t.paidAmount || "";
    document.getElementById('t-promise').value = t.promiseDate || "";

    toggleSettlementFields();
    toggleUPIField();

    // Store ID for update
    document.getElementById('txForm').dataset.editId = id;

    openModal();
}

function deleteTx(id) {
    showConfirm("Delete this record permanently?", () => {
        state.deleteTransaction(id);
        renderAll();

        // Refresh Customer Portal if open
        const portal = document.getElementById('custPortalModal');
        if (portal && portal.style.display === 'flex') {
            const name = document.getElementById('portal-cust-name').innerText;
            openCustPortal(name);
        }

        showToast("Record Deleted");
    }, "Delete Transaction");
}

// Duplicate openModalWithMode removed



function openModal() { document.getElementById('txModal').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function updateFormDropdowns() {
    const type = document.getElementById('t-type').value;
    const activeCatalog = state.getCatalog(type);
    const pSel = document.getElementById('t-product');
    pSel.innerHTML = Object.keys(activeCatalog).map(p => `<option value="${p}">${p}</option>`).join('');
    updateSizeDropdown();

    const dl = document.getElementById('traderList');
    dl.innerHTML = Object.keys(state.traders).map(k => `<option value="${k}">${k}</option>`).join('');
}

function updateSizeDropdown() {
    const type = document.getElementById('t-type').value;
    const activeCatalog = state.getCatalog(type);
    const prod = document.getElementById('t-product').value;
    const items = activeCatalog[prod] || [];
    document.getElementById('t-size').innerHTML = items.map(item => `<option value="${item.size}">${item.size}</option>`).join('');
}

function checkNewCustomer(val) {
    const box = document.getElementById('new-cust-phone-box');
    if (val && !state.traders[val]) {
        box.style.display = 'block';
        document.getElementById('t-phone').required = true;
    } else {
        box.style.display = 'none';
        document.getElementById('t-phone').required = false;
    }
}

function toggleSettlementFields() {
    const status = document.getElementById('t-status').value;
    const paidBox = document.getElementById('paid-amount-box');
    const dateBox = document.getElementById('promise-date-box');

    if (status === 'booked') {
        paidBox.style.display = 'block';
        dateBox.style.display = 'block';
    } else {
        paidBox.style.display = 'none';
        dateBox.style.display = 'none';
        if (status === 'purchased') {
            autoFillPaid();
        }
    }
}

function toggleUPIField() {
    const method = document.getElementById('t-payment').value;
    const upiBox = document.getElementById('upi-id-box');
    upiBox.style.display = (method === 'UPI') ? 'block' : 'none';
}

function autoFillPaid() {
    const status = document.getElementById('t-status').value;
    const total = document.getElementById('t-amount').value;
    if (status === 'purchased') {
        document.getElementById('t-paid').value = total;
    }
}

document.getElementById('txForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = e.target.dataset.editId;

    const txData = {
        date: document.getElementById('t-date').value,
        name: document.getElementById('t-customer').value.trim(),
        product: document.getElementById('t-product').value,
        size: document.getElementById('t-size').value,
        qty: Number(document.getElementById('t-qty').value),
        type: document.getElementById('t-type').value,
        amount: Number(document.getElementById('t-amount').value) || 0,
        status: document.getElementById('t-status').value,
        paymentMethod: document.getElementById('t-payment').value,
        upiId: document.getElementById('t-upi-id').value.trim(),
        paidAmount: Number(document.getElementById('t-paid').value) || 0,
        promiseDate: document.getElementById('t-promise').value || ""
    };

    // Validation
    if (txData.amount < 0 || txData.paidAmount < 0) return showToast("Monetary amounts cannot be negative!", "error");
    if (!txData.name) return showToast("Customer name is required!", "warning");

    // Enforce Phone for New Customer
    if (!state.traders[txData.name]) {
        const phone = document.getElementById('t-phone').value.trim();
        if (!phone || phone.length < 10) {
            showToast("Please enter a valid 10-digit contact number for the new customer.", "error");
            document.getElementById('t-phone').focus();
            return;
        }
        state.addTrader(txData.name, {
            contact: phone,
            type: txData.type === 'buy' ? 'Dealer' : 'Customer'
        });
    }

    let savedId = txData.id;
    if (editId) {
        state.updateTransaction({ ...txData, id: Number(editId) });
        showToast("Entry Updated!");
        closeModal('txModal');
    } else {
        txData.id = Date.now();
        savedId = txData.id;
        state.addTransaction(txData);
        // Don't show generic toast, go to action flow
        showToast("Entry Saved!");
        closeModal('txModal');
        // Trigger Next Action Modal
        setTimeout(() => openActionModal(savedId), 300);
    }

    document.getElementById('new-cust-phone-box').style.display = 'none';
    document.getElementById('t-phone').value = '';

    // Clean up edit meta
    delete e.target.dataset.editId;
    document.getElementById('tx-title').innerText = 'New Transaction';

    renderAll();
});

function openActionModal(id) {
    const t = [...state.sales, ...state.purchases].find(x => x.id === id);
    if (!t) return;

    // Create modal if it doesn't exist (Dynamic injection)
    let modal = document.getElementById('actionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'actionModal';
        modal.className = 'modal';
        modal.style.zIndex = '1100'; // Higher than others
        modal.innerHTML = `
                <div class="modal-content" style="text-align:center; width:90%; max-width:400px; height:auto;">
                <div style="background:#def7ec; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
                    <i class="fas fa-check" style="font-size:30px; color:#10b981;"></i>
                </div>
                <h3 style="margin-top:0; color:var(--dark);">Transaction Saved!</h3>
                <p style="color:#64748B; margin-bottom:30px;">ID: <span id="act-id">--</span></p>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <button id="btn-act-print" class="btn-submit" style="margin:0; background:var(--primary);">
                        <i class="fas fa-print"></i> Print Receipt
                    </button>
                    <button id="btn-act-new" class="btn-submit" style="margin:0; background:white; color:var(--dark); border:2px solid #e2e8f0;">
                        <i class="fas fa-plus"></i> Add Another Entry
                    </button>
                    <button id="btn-act-close" style="background:transparent; border:none; color:#94A3B8; cursor:pointer; margin-top:10px;">
                        Close
                    </button>
                </div>
            </div>
                `;
        document.body.appendChild(modal);
    }

    // Bind Data & Events
    document.getElementById('act-id').innerText = id.toString().slice(-6);

    // Print Button
    const printBtn = document.getElementById('btn-act-print');
    if (checkPerm('print', true) === false) {
        printBtn.style.display = 'none';
    } else {
        printBtn.style.display = 'flex';
        printBtn.onclick = () => {
            modal.style.display = 'none';
            printReceipt(id);
        };
    }

    // New Entry Button
    document.getElementById('btn-act-new').onclick = () => {
        modal.style.display = 'none';
        openModalWithMode(); // Re-open new form
    };

    // Close Button
    document.getElementById('btn-act-close').onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    sidebar.classList.toggle('collapsed');
}

function printReceipt(id) {
    // Loose equality to handle string/number mismatches
    const txList = [...state.sales, ...state.purchases];
    const t = txList.find(tx => tx.id == id);
    if (!t) return showToast("Transaction not found for printing", "error");
    const trader = state.traders[t.name];
    const contact = (typeof trader === 'object') ? trader.contact : (trader || 'N/A');

    document.getElementById('r-id').innerText = t.id.toString().slice(-6);
    document.getElementById('r-date').innerText = t.date;
    document.getElementById('r-cust').innerText = t.name;
    document.getElementById('r-contact').innerText = contact;
    document.getElementById('r-prod').innerText = `${t.product} (${t.size})`;
    document.getElementById('r-qty').innerText = t.qty;
    document.getElementById('r-amt').innerText = `\u20B9${(t.amount || 0).toLocaleString('en-IN')} `;
    document.getElementById('r-total').innerText = (t.amount || 0).toLocaleString('en-IN');

    // Populate the hidden receipt div first
    const pInfo = document.getElementById('r-payment-info');
    pInfo.innerHTML = `Method: ${t.paymentMethod || 'Cash'} ${(t.paymentMethod === 'UPI' && t.upiId) ? `| Ref: ${t.upiId}` : ''} `;

    // Settlement Info in Receipt
    const paid = Number(t.paidAmount) || 0;
    const total = Number(t.amount) || 0;
    const balance = total - paid;
    const sInfo = document.getElementById('r-settlement-info');
    if (t.status === 'booked') {
        sInfo.style.display = 'block';
        sInfo.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:700;">
                <span>Paid (Advance):</span> <span>\u20B9${paid.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--danger); border-top:1px solid #eee; margin-top:5px; padding-top:5px;">
                <span>Balance Due:</span> <span>\u20B9${balance.toLocaleString('en-IN')}</span>
            </div>
            ${t.promiseDate ? `<div style="font-size:0.75rem; color:#64748B; margin-top:5px;">Promised Settlement: ${t.promiseDate}</div>` : ''}
        `;
    } else {
        sInfo.style.display = 'none';
    }

    // --- POPULATE A4 INVOICE DATA ---
    document.getElementById('inv-id').innerText = t.id.toString().slice(-6);
    document.getElementById('inv-date').innerText = t.date;
    document.getElementById('inv-cust-name').innerText = t.name;
    document.getElementById('inv-cust-contact').innerText = contact;
    document.getElementById('inv-prod').innerText = `${t.product} (${t.size})`;

    // Calculate Rate (Total / Qty)
    const rate = t.qty > 0 ? (t.amount / t.qty) : 0;
    document.getElementById('inv-rate').innerText = rate.toFixed(2);
    document.getElementById('inv-qty').innerText = t.qty;
    document.getElementById('inv-amount').innerText = (t.amount || 0).toLocaleString('en-IN');

    document.getElementById('inv-subtotal').innerText = (t.amount || 0).toLocaleString('en-IN');
    document.getElementById('inv-total').innerText = `\u20B9 ${(t.amount || 0).toLocaleString('en-IN')} `;

    // Default to 'bill' view
    setPrintFormat('bill');
    document.getElementById('printPreviewModal').style.display = 'flex';
}



function setPrintFormat(fmt) {
    currentPrintFormat = fmt;

    // Update Buttons
    const btnBill = document.getElementById('btn-fmt-bill');
    const btnInv = document.getElementById('btn-fmt-invoice');

    if (fmt === 'bill') {
        btnBill.style.background = 'var(--primary)';
        btnBill.style.color = 'white';
        btnBill.style.borderColor = 'var(--primary)';

        btnInv.style.background = 'white';
        btnInv.style.color = '#64748B';
        btnInv.style.borderColor = '#ccc';

        const content = document.getElementById('receipt-print').innerHTML;
        document.getElementById('print-preview-content').innerHTML = content;
    } else {
        btnInv.style.background = 'var(--primary)';
        btnInv.style.color = 'white';
        btnInv.style.borderColor = 'var(--primary)';

        btnBill.style.background = 'white';
        btnBill.style.color = '#64748B';
        btnBill.style.borderColor = '#ccc';

        const content = document.getElementById('invoice-print').innerHTML;
        document.getElementById('print-preview-content').innerHTML = content;
    }
}

function closePrintPreview() {
    document.getElementById('printPreviewModal').style.display = 'none';
}

function confirmPrint() {
    closePrintPreview();

    // Proceed with actual print depending on format
    const receiptArea = document.getElementById('receipt-print');
    const invoiceArea = document.getElementById('invoice-print');

    // Reset both to hidden first
    receiptArea.style.display = 'none';
    invoiceArea.style.display = 'none';

    // Force the selected one to show
    if (currentPrintFormat === 'bill') {
        receiptArea.style.display = 'block';
        document.body.classList.add('print-bill');
        document.body.classList.remove('print-invoice');
    } else {
        invoiceArea.style.display = 'block';
        document.body.classList.add('print-invoice');
        document.body.classList.remove('print-bill');
    }

    setTimeout(() => {
        window.print();

        // Cleanup after print dialog closes
        receiptArea.style.display = 'none';
        invoiceArea.style.display = 'none';
        document.body.classList.remove('print-bill');
        document.body.classList.remove('print-invoice');
    }, 500);
}

function toggleUPIField() {
    const method = document.getElementById('t-payment').value;
    const box = document.getElementById('upi-id-box');
    if (method === 'UPI') {
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
        document.getElementById('t-upi-id').value = '';
    }
}

function autoFillPaid() {
    const amt = document.getElementById('t-amount').value;
    const status = document.getElementById('t-status').value;
    if (status === 'purchased') {
        document.getElementById('t-paid').value = amt;
    }
}

// --- GLOBAL EXPORTS (Crucial for HTML onclick handlers) ---
window.printReceipt = printReceipt;
window.deleteTx = deleteTx;
window.editTx = editTx;
window.deleteCust = deleteCust;
window.editCust = editCust;
window.openCustPortal = openCustPortal;
window.setLimit = setLimit;
window.openLedger = openLedger;
window.setDashMode = setDashMode;
window.nav = nav;
window.renderSalesTable = renderSalesTable;
window.renderDashboard = renderDashboard;
window.exportDB = exportDB;
window.importDB = importDB;
window.resetDB = resetDB;
window.changeTechTeamPass = changeTechTeamPass;
window.toggleUPIField = toggleUPIField;
window.autoFillPaid = autoFillPaid;
