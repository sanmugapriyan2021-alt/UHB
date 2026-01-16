"use strict";
const catalog = {
    activeMgrMode: 'sales',

    setMgrMode(mode) {
        this.activeMgrMode = mode;
        const sBtn = document.getElementById('mgr-cat-sales');
        const bBtn = document.getElementById('mgr-cat-buy');

        if (mode === 'sales') {
            sBtn.classList.add('active');
            bBtn.classList.remove('active');
        } else {
            sBtn.classList.remove('active');
            bBtn.classList.add('active');
        }
        this.render();
    },

    render() {
        const container = document.getElementById('catalog-list');
        if (!container) return;

        const activeCatalog = state.getCatalog(this.activeMgrMode);

        let html = `
            <table class="catalog-table">
                <thead>
                    <tr>
                        <th style="width:40%;">Product</th>
                        <th style="width:25%;">Size</th>
                        <th style="width:25%;">Price (\u20B9)</th>
                        <th style="width:10%;"></th>
                    </tr>
                </thead>
                <tbody>
        `;

        const canEditCatalog = checkPerm('limits');

        let count = 0;
        Object.entries(activeCatalog).forEach(([prod, items]) => {
            if (!Array.isArray(items)) return;

            items.forEach((item, idx) => {
                if (!item || typeof item !== 'object') return; // Ensure item is an object
                count++;
                html += `
                    <tr>
                        <td style="font-weight:600; color:var(--primary);">${prod}</td>
                        <td>${item.size || 'N/A'}</td>
                        <td>
                            <input type="number" value="${item.price || 0}" 
                                onchange="catalog.updatePrice('${prod}', '${item.size}', this.value)"
                                ${!canEditCatalog ? 'disabled' : ''}
                                class="edit-price">
                        </td>
                        <td style="text-align:right;">
                            ${canEditCatalog ? `<i class="fas fa-trash-alt" onclick="catalog.removeSize('${prod}', '${item.size}')" 
                               style="cursor:pointer; color:var(--danger); opacity:0.6; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6"></i>` : ''}
                        </td>
                    </tr>
                `;
            });
        });

        if (count === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94A3B8;">
                <i class="fas fa-box-open" style="font-size:2rem; margin-bottom:10px; opacity:0.5;"></i><br>
                No items in ${this.activeMgrMode === 'sales' ? 'Sales' : 'Purchase'} catalog.
            </td></tr>`;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    updatePrice(prod, size, newPrice) {
        const canEditCatalog = checkPerm('limits');
        if (!canEditCatalog) return showToast("Permission Denied: Catalog edit access required", "error");

        // Use state helper
        state.updateCatalogItem(this.activeMgrMode, prod, size, Number(newPrice));
        updateValuation();
    },

    addProduct() {
        const canEditCatalog = checkPerm('limits');
        if (!canEditCatalog) return showToast("Permission Denied: Catalog edit access required", "error");

        const name = document.getElementById('new-prod-name').value.trim();
        const size = document.getElementById('new-prod-size').value.trim();
        const price = Number(document.getElementById('new-prod-price').value) || 0;

        if (!name || !size) return showToast("Product name and Size are required", "warning");

        // Use state helper
        state.addCatalogItem(this.activeMgrMode, name, { size: size, price: price });

        document.getElementById('new-prod-name').value = '';
        document.getElementById('new-prod-size').value = '';
        document.getElementById('new-prod-price').value = '';

        this.render();
        updateFormDropdowns();
        renderInventory();
        showToast("Item added successfully!");
    },

    removeSize(prod, size) {
        const canEditCatalog = checkPerm('limits');
        if (!canEditCatalog) return showToast("Permission Denied: Catalog edit access required", "error");

        // Use state helper
        state.removeCatalogItem(this.activeMgrMode, prod, size);
        this.render();
        updateFormDropdowns();
        renderInventory();
    },

    save() {
        state.saveCatalog(this.activeMgrMode);
    }
};

