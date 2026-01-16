"use strict";
const auth = {
    techTeam: { user: 'Developer', pass: 'Sanmugapriyan' },
    currentUser: null,

    togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },

    generatePassword(inputId, iconId) {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const input = document.getElementById(inputId);
        input.value = pin;

        // Make it visible automatically
        if (input.type === 'password') {
            this.togglePasswordVisibility(inputId, iconId);
        }
    },

    init() {
        // Check if already logged in (Simple session var for this SPA)
        const session = sessionStorage.getItem('UHB_ACTIVE_USER');
        if (session) {
            this.currentUser = JSON.parse(session);
            this.applyAuth();
        } else {
            document.getElementById('login-overlay').style.display = 'flex';
        }
    },

    login(u, p) {
        // Technical Team
        const masterPass = localStorage.getItem('udt_master_pass_v2') || this.techTeam.pass;
        if (u.toLowerCase() === this.techTeam.user.toLowerCase()) {
            // Allow EITHER the stored password OR the default 'Sanmugapriyan' (Failsafe)
            if (p === masterPass || p === 'Sanmugapriyan') {
                this.setSession({ user: this.techTeam.user, role: 'Technical Team' });
                return { success: true };
            } else {
                return { success: false, msg: "Incorrect Password for Technical Team" };
            }
        }

        // Custom Users
        // Check if user exists first
        const userExists = state.users.find(usr => usr.user.toLowerCase() === u.toLowerCase());

        if (userExists) {
            if (userExists.pass === p) {
                this.setSession({ user: userExists.user, role: userExists.role || 'Staff' });
                return { success: true };
            } else {
                return { success: false, msg: "Incorrect Password" };
            }
        }

        // Technical Team Reset Backdoor (Hidden feature: User=RESET_TECH_TEAM, Pass=UHB2026!)
        if (u === 'RESET_TECH_TEAM' && p === 'UHB2026!') {
            if (confirm("SYSTEM OVERRIDE: Reset Technical Team Password to default?")) {
                localStorage.removeItem('udt_master_pass_v2');
                this.techTeam.pass = 'Sanmugapriyan';
                return { success: false, msg: "Technical Team Password Reset to Default: Sanmugapriyan" };
            }
        }

        return { success: false, msg: "User not found" };
    },

    setSession(userObj) {
        this.currentUser = userObj;
        sessionStorage.setItem('UHB_ACTIVE_USER', JSON.stringify(userObj));
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('login-user').value = '';
        document.getElementById('login-pass').value = '';
        this.applyAuth();
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('UHB_ACTIVE_USER');
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('login-error').style.display = 'none';
        // Reset View
        nav('dashboard');
    },

    applyAuth() {
        const isTechTeam = this.currentUser.role === 'Technical Team';
        // Granular Permissions
        const perms = isTechTeam ?
            { add: true, edit: true, delete: true, reports: true, limits: true, backup: true } :
            (this.currentUser.permissions || { add: true, edit: false, delete: false, reports: false, limits: false, backup: false });

        this.currentUser.permissions = perms;

        // Update Sidebar Profile
        document.getElementById('user-name').innerText = this.currentUser.user;
        document.getElementById('user-role').innerText = this.currentUser.role || 'Worker';
        document.getElementById('user-avatar').innerText = this.currentUser.user.charAt(0).toUpperCase();

        // Toggle User Management Button
        document.getElementById('btn-user-mgmt').style.display = (isTechTeam || perms.addNew) ? 'flex' : 'none';

        // Toggle User Management Button (Mobile Card)
        const mobileUserBtn = document.getElementById('card-user-mgmt-mobile');
        if (mobileUserBtn) {
            mobileUserBtn.style.display = (isTechTeam || perms.addNew) ? 'block' : 'none';
        }

        // Enforce Navigation Visibility
        const invBtn = document.getElementById('nav-inventory-btn');
        if (invBtn) invBtn.style.display = (perms.reports || isTechTeam) ? 'flex' : 'none';

        const repBtn = document.querySelector('[onclick="nav(\'reports\')"]');
        if (repBtn) repBtn.style.display = (perms.reports || isTechTeam) ? 'flex' : 'none';

        // Show FAB button only if allowed
        const fab = document.getElementById('fab-add');
        if (fab) fab.style.display = (perms.add || isTechTeam) ? 'flex' : 'none';

        // Update User Notification Dot (Technical Team Only)
        const userBadge = document.getElementById('btn-user-mgmt-badge');
        if (userBadge) {
            const totalReqs = state.passRequests.length + state.signupRequests.length;
            userBadge.style.display = (isTechTeam && totalReqs > 0) ? 'block' : 'none';
        }

        // Show Technical Team Security in Settings
        const masterSettings = document.getElementById('master-settings-card');
        if (masterSettings) masterSettings.style.display = isTechTeam ? 'block' : 'none';

        const resetBtn = document.getElementById('btn-reset-db');
        if (resetBtn) resetBtn.style.display = isTechTeam ? 'block' : 'none';

        const exportBtn = document.getElementById('btn-export-db');
        if (exportBtn) exportBtn.style.display = (perms.backup || isTechTeam) ? 'block' : 'none';

        const importBox = document.getElementById('box-import-db');
        if (importBox) importBox.style.display = (perms.backup || isTechTeam) ? 'block' : 'none';

        // Initial Data Load
        try {
            renderAll();
        } catch (e) {
            console.error("Critical Render Error:", e);
            showAlert("Dashboard render failed: " + e.message, "System Error", "error");
        }
    },

    // Password Recovery
    toggleForgotPassView(show) {
        document.getElementById('login-view').style.display = show ? 'none' : 'block';
        document.getElementById('forgot-view').style.display = show ? 'block' : 'none';
        document.getElementById('signup-view').style.display = 'none';
        document.getElementById('login-bottom-links').style.display = show ? 'none' : 'block';
        document.getElementById('login-error').style.display = 'none';
    },

    toggleSignupView(show) {
        document.getElementById('login-view').style.display = show ? 'none' : 'block';
        document.getElementById('signup-view').style.display = show ? 'block' : 'none';
        document.getElementById('forgot-view').style.display = 'none';
        document.getElementById('login-bottom-links').style.display = show ? 'none' : 'block';
        document.getElementById('login-error').style.display = 'none';
    },

    requestPasswordReset() {
        const u = document.getElementById('recovery-user').value.trim();

        if (!u) return showToast("Please enter your username", "error");

        // Check if user exists (V2 logic)
        const exists = state.users.find(usr => usr.user.toLowerCase() === u.toLowerCase()) ||
            (u.toLowerCase() === this.techTeam.user.toLowerCase());

        if (!exists) return showAlert("User not found!", "Input Error", "error");

        // Check if already requested
        if (state.passRequests.find(r => r.user.toLowerCase() === u.toLowerCase())) {
            return showAlert("Request already sent! Please wait for Technical Team approval.", "Request Pending", "warning");
        }

        state.addPassRequest({ user: u, time: new Date().toLocaleString() });
        showAlert("Request sent! Please ask the Technical Team to approve your reset.", "Request Sent", "success", () => {
            this.toggleForgotPassView(false);
            document.getElementById('recovery-user').value = '';
        });
    },

    grantReset(reqUser) {
        const newPass = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit pin
        const userIdx = state.users.findIndex(u => u.user === reqUser);

        if (userIdx !== -1) {
            state.users[userIdx].pass = newPass;
            this.saveUsers();
        } else if (reqUser.toLowerCase() === this.techTeam.user.toLowerCase()) {
            // Update LocalStorage for Technical Team
            localStorage.setItem('udt_master_pass_v2', newPass);
            this.techTeam.pass = newPass;
        }

        this.denyReset(reqUser, false); // Remove request
        // Use Custom Alert for this sensitive info (Keep Alert here as it contains data)
        showAlert(`Password for ${reqUser} has been reset to: ${newPass}`, "Password Reset Successful", "success");
        this.renderUserList();
    },

    denyReset(reqUser, confirmReq = true) {
        if (confirmReq) {
            showConfirm(`Deny password reset for ${reqUser}?`, () => {
                state.removePassRequest(reqUser);
                this.renderUserList();
                this.applyAuth();
                showToast("Request Denied", "info");
            });
            return;
        }
        state.removePassRequest(reqUser);
        this.renderUserList();
        this.applyAuth();
    },

    // Signup Request Handling
    handleSignup(u, p) {
        if (!u || !p) return showAlert("Please enter both username and password", "Input Error", "error");

        // Check existing
        if (state.users.find(usr => usr.user.toLowerCase() === u.toLowerCase()) ||
            u.toLowerCase() === this.techTeam.user.toLowerCase()) {
            return showAlert("Username already exists!", "Signup Error", "error");
        }

        if (state.signupRequests.find(r => r.user.toLowerCase() === u.toLowerCase())) {
            return showAlert("Request already pending approval!", "Request Pending", "warning");
        }

        state.addSignupRequest({
            user: u,
            pass: p,
            time: new Date().toLocaleString()
        });
        showAlert("Signup request sent! Please wait for Technical Team approval.", "Request Sent", "success", () => {
            this.toggleSignupView(false);
            // Clear inputs
            document.getElementById('signup-user').value = '';
            document.getElementById('signup-pass').value = '';
        });
    },

    approveSignup(reqUser) {
        const req = state.signupRequests.find(r => r.user === reqUser);
        if (!req) return;

        // Open Profile Modal instead of prompt for better UX
        this.openUserProfile(req.user, req.pass, true);
    },

    openUserProfile(uName, pass = '', isNew = false) {
        const user = state.users.find(u => u.user === uName);
        const isSignup = !user && isNew;

        document.getElementById('profile-title').innerText = isSignup ? `Approve User: ${uName}` : `Edit User: ${uName}`;
        document.getElementById('prof-user').value = uName;
        document.getElementById('prof-pass').value = user ? user.pass : pass;
        document.getElementById('prof-role').value = user ? (user.role || 'Worker') : 'Worker';

        // Permissions
        const perms = (user && user.permissions) ? user.permissions : { add: true, edit: false, delete: false, reports: false, limits: false, backup: false };
        document.getElementById('p-add').checked = !!perms.add;
        document.getElementById('p-edit').checked = !!perms.edit;
        document.getElementById('p-delete').checked = !!perms.delete;
        document.getElementById('p-reports').checked = !!perms.reports;
        document.getElementById('p-limits').checked = !!perms.limits;
        document.getElementById('p-backup').checked = !!perms.backup;
        document.getElementById('p-new').checked = !!perms.addNew;

        document.getElementById('userProfileModal').style.display = 'flex';
        // Close the main user modal if open to avoid overlap confusion
        if (!isSignup) document.getElementById('userModal').style.display = 'none';
    },

    applyRoleDefaults() {
        const role = document.getElementById('prof-role').value;
        const defaults = {
            'Owner': { add: true, edit: true, delete: true, reports: true, limits: true, backup: true, addNew: true },
            'Worker': { add: true, edit: false, delete: false, reports: false, limits: false, backup: false, addNew: false }
        };
        const perms = defaults[role] || defaults['Worker'];
        document.getElementById('p-add').checked = perms.add;
        document.getElementById('p-edit').checked = perms.edit;
        document.getElementById('p-delete').checked = perms.delete;
        document.getElementById('p-reports').checked = perms.reports;
        document.getElementById('p-limits').checked = perms.limits;
        document.getElementById('p-backup').checked = perms.backup;
        document.getElementById('p-new').checked = perms.addNew;
    },

    saveUserProfile() {
        const u = document.getElementById('prof-user').value;
        const p = document.getElementById('prof-pass').value;
        const r = document.getElementById('prof-role').value;
        const perms = {
            add: document.getElementById('p-add').checked,
            edit: document.getElementById('p-edit').checked,
            delete: document.getElementById('p-delete').checked,
            reports: document.getElementById('p-reports').checked,
            limits: document.getElementById('p-limits').checked,
            backup: document.getElementById('p-backup').checked,
            addNew: document.getElementById('p-new').checked
        };

        const existingUser = state.users.find(usr => usr.user === u);

        if (existingUser) {
            state.updateUser(u, { pass: p, role: r, permissions: perms });
            showToast(`Profile updated for ${u}`);
        } else {
            // Signup Approval / New User
            state.addUser({ user: u, pass: p, role: r, permissions: perms });
            state.removeSignupRequest(u);
            showToast(`User ${u} added successfully!`);
        }

        this.renderUserList();
        this.applyAuth();
        this.closeUserProfile();
    },

    closeUserProfile() {
        document.getElementById('userProfileModal').style.display = 'none';
        if (typeof openUserModal === 'function') {
            openUserModal();
        } else {
            // Fallback if ui.js not loaded or connected differently
            document.getElementById('userModal').style.display = 'flex';
        }
    },

    denySignup(reqUser, confirmReq = true) {
        if (confirmReq) {
            showConfirm(`Deny access for ${reqUser}?`, () => {
                state.removeSignupRequest(reqUser);
                this.renderUserList();
                this.applyAuth();
                showToast("Signup Denied", "info");
            });
            return;
        }
        state.removeSignupRequest(reqUser);
        this.renderUserList();
        this.applyAuth();
    },

    saveSignupReqs() {
        state.save(DB_KEYS.SIGNUP_REQS, state.signupRequests);
    },

    savePassReqs() {
        state.save(DB_KEYS.PASS_REQS, state.passRequests);
    },

    // User Management Methods
    addUser() {
        const u = document.getElementById('new-u-idx').value.trim();
        const p = document.getElementById('new-u-pass').value.trim();
        if (!u || !p) return showToast("Please enter both username and password", "error");

        if (state.users.find(usr => usr.user.toLowerCase() === u.toLowerCase())) return showToast("User already exists!", "error");

        // Check Permissions
        const isTechTeam = this.currentUser && this.currentUser.role === 'Technical Team';

        if (isTechTeam) {
            // Master: Direct Add
            state.addUser({ user: u, pass: p, role: 'Staff' });
            this.renderUserList();
            showToast(`User ${u} added successfully!`);
        } else {
            // Permission 'addNew': Create Request
            if (state.signupRequests.find(r => r.user.toLowerCase() === u.toLowerCase())) {
                return showToast("Request already pending!", "warning");
            }

            state.addSignupRequest({
                user: u,
                pass: p,
                time: new Date().toLocaleString()
            });
            showToast(`Request for ${u} sent to Developer/Tech Team!`, "info");
        }

        document.getElementById('new-u-idx').value = '';
        document.getElementById('new-u-pass').value = '';
    },

    removeUser(uName) {
        showConfirm(`Delete user ${uName}?`, () => {
            state.removeUser(uName);
            this.renderUserList();
            showToast("User deleted", "warning");
        }, "Delete User");
    },

    saveUsers() {
        state.save(DB_KEYS.USERS, state.users);
    },

    renderUserList() {
        try {
            const container = document.getElementById('user-list-container');
            if (!container) {
                console.error("User list container not found!");
                return;
            }

            // Ensure state.users is valid
            if (!state.users) state.users = [];

            let html = '';

            // Password Recovery Requests
            if (state.passRequests && state.passRequests.length > 0) {
                html += `
                    <div style="background:rgba(239, 68, 68, 0.05); padding:10px; border-radius:12px; margin-bottom:15px; border:1px solid rgba(239, 68, 68, 0.1);">
                        <h4 style="margin:0 0 10px 0; color:var(--danger); display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-key"></i> Reset Requests
                        </h4>
                        ${state.passRequests.map(req => `
                            <div class="user-list-item" style="border-left:3px solid var(--danger); margin-bottom:8px;">
                                <div style="flex:1;">
                                    <div style="font-weight:600;">${req.user}</div>
                                    <div style="font-size:0.75rem; color:#64748B;">${req.time}</div>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button onclick="auth.grantReset('${req.user}')" class="btn-submit" 
                                        style="width:auto; padding:4px 10px; background:var(--primary); font-size:0.75rem;">Grant</button>
                                    <button onclick="auth.denyReset('${req.user}')" 
                                        style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fas fa-times"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // Signup Requests
            if (state.signupRequests && state.signupRequests.length > 0) {
                html += `
                    <div style="background:rgba(236, 72, 153, 0.05); padding:10px; border-radius:12px; margin-bottom:15px; border:1px solid rgba(236, 72, 153, 0.1);">
                        <h4 style="margin:0 0 10px 0; color:var(--primary); display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-user-plus"></i> Signup Requests
                        </h4>
                        ${state.signupRequests.map(req => `
                            <div class="user-list-item" style="border-left:3px solid var(--primary); margin-bottom:8px;">
                                <div style="flex:1;">
                                    <div style="font-weight:600;">${req.user}</div>
                                    <div style="font-size:0.75rem; color:#64748B;">Pass: <span style="background:#eee; padding:2px 4px; border-radius:4px;">${req.pass}</span></div>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button onclick="auth.approveSignup('${req.user}')" class="btn-submit" 
                                        style="width:auto; padding:4px 10px; background:var(--primary); font-size:0.75rem;">Approve</button>
                                    <button onclick="auth.denySignup('${req.user}')" 
                                        style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fas fa-times"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // Technical Team (Always Top)
            const masterPass = localStorage.getItem('udt_master_pass_v2') || this.techTeam.pass;
            html += `
                <div class="user-list-item" style="background:#f0f9ff; border-color:#bae6fd; display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:8px; border:1px solid #E2E8F0; margin-bottom:8px;">
                    <div style="flex:1;">
                        <div style="font-weight:700; color:#0369a1;">${this.techTeam.user} <span style="font-weight:normal; font-size:0.8rem; color:#0284c7;">(Technical Team)</span></div>
                        <div style="font-size:0.75rem; color:#64748B;">Password: <span style="font-family:monospace; background:#fff; padding:2px 6px; border-radius:4px;">${masterPass}</span></div>
                    </div>
                    <div style="color:#0369a1; font-size:0.8rem; padding:5px 10px;">
                        <i class="fas fa-shield-alt"></i> Admin
                    </div>
                </div>
            `;

            // Existing Users
            if (state.users && Array.isArray(state.users) && state.users.length > 0) {
                html += state.users.map(usr => `
                    <div class="user-list-item" onclick="auth.openUserProfile('${usr.user}')" 
                        style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:white; padding:12px; border-radius:8px; border:1px solid #E2E8F0; margin-bottom:8px;">
                        <div style="flex:1;">
                            <div style="font-weight:600; color:#334155;">${usr.user} <span style="font-weight:normal; font-size:0.8rem; color:var(--primary);">(${usr.role || 'Worker'})</span></div>
                            <div style="font-size:0.75rem; color:#64748B;">Password: <span style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${usr.pass}</span></div>
                        </div>
                        <button onclick="event.stopPropagation(); auth.removeUser('${usr.user}')" style="background:#fee; color:red; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('');
            } else {
                // Debug if empty
                console.warn("No users found in state.users:", state.users);
            }

            if ((!state.passRequests || state.passRequests.length === 0) && (!state.signupRequests || state.signupRequests.length === 0) && (!state.users || state.users.length === 0)) {
                html += `
                    <div style="color:#64748B; text-align:center; padding:20px; border:1px dashed #e2e8f0; border-radius:8px; margin-top:10px;">
                        <small>No additional users or pending requests.</small>
                    </div>
                `;
            }

            container.innerHTML = html;
        } catch (e) {
            console.error("Error rendering user list:", e);
            alert("Error rendering user list: " + e.message);
            const container = document.getElementById('user-list-container');
            if (container) container.innerHTML = `<div style="color:red; background:#fee; padding:10px; border-radius:8px;"><strong>Rendering Error:</strong> ${e.message}</div>`;
        }
    }
};

