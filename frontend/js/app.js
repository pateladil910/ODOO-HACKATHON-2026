document.write('<script src="js/mock-api.js"></script>');

// 0. Synchronous Theme Pre-Load (Prevents flicker)
const currentTheme = localStorage.getItem('transitOpsTheme') || 'dark';
if (currentTheme === 'light' && document.body) {
    document.body.classList.add('light-theme');
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Authentication Check
    const userData = localStorage.getItem('transitOpsUser');
    if (!userData) {
        window.location.href = 'login.html';
        return; // Stop execution
    }

    const user = JSON.parse(userData);

    // 1.5. Dynamic Shared Topbar Render
    const headerEl = document.querySelector('.app-header');
    if (headerEl) {
        const formattedRole = user.role ? user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Role';
        const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
        const displayInitial = (displayName ? displayName.charAt(0) : 'U').toUpperCase();

        headerEl.innerHTML = `
            <div class="header-left">
                <button class="mobile-toggle" id="mobileToggle">
                    <i class="ph ph-list"></i>
                </button>
                <div class="header-search" style="position: relative;">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="text" id="globalSearchInput" placeholder="Search...">
                    <div class="global-search-results" id="globalSearchResults"></div>
                </div>
            </div>
            <div class="header-right">
                <button class="header-action" id="themeToggleBtn" title="Toggle Theme">
                    <i class="ph ph-sun" id="themeIcon"></i>
                </button>
                <div class="header-user-pill">
                    <div class="header-user-avatar">${displayInitial}</div>
                    <div class="header-user-info">
                        <span class="header-user-name">${displayName}</span>
                        <span class="header-user-role">${formattedRole}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 2. Populate User Info in Sidebar
    const userNameEls = document.querySelectorAll('.user-name');
    const userRoleEls = document.querySelectorAll('.user-role');
    const userAvatarEls = document.querySelectorAll('.user-avatar');

    userNameEls.forEach(el => el.textContent = user.name || 'User');
    userRoleEls.forEach(el => el.textContent = user.role || 'Role');
    userAvatarEls.forEach(el => {
        el.textContent = (user.name ? user.name.charAt(0) : 'U').toUpperCase();
    });

    // 3. Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('transitOpsUser');
            window.location.href = 'login.html';
        });
    }

    // 4. Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('appSidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 991) {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target) && sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    // 5. Role-Based Access Control (RBAC) UI Rendering
    // Hide nav items based on role
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const allowedRoles = item.getAttribute('data-roles');
        if (allowedRoles) {
            const rolesArray = allowedRoles.split(',');
            if (!rolesArray.includes(user.role) && !rolesArray.includes('all')) {
                item.style.display = 'none';
            }
        }
    });

    // 5.5. Route Protection: Redirect if user attempts to directly access unauthorized page via URL
    let currentPage = window.location.pathname.split('/').pop();
    if (!currentPage || currentPage === '/') {
        currentPage = 'dashboard.html';
    }
    if (currentPage !== 'login.html') {
        const currentNavItem = document.querySelector(`.nav-item[href="${currentPage}"]`);
        if (currentNavItem) {
            const allowedRoles = currentNavItem.getAttribute('data-roles');
            if (allowedRoles) {
                const rolesArray = allowedRoles.split(',');
                if (!rolesArray.includes(user.role) && !rolesArray.includes('all')) {
                    window.location.href = 'dashboard.html';
                    return;
                }
            }
        }
    }

    // 6. Dynamic Theme Toggle Logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    
    // Apply saved theme state to icon (body class is already handled synchronously above)
    const savedTheme = localStorage.getItem('transitOpsTheme') || 'dark';
    if (savedTheme === 'light') {
        if (themeIcon) {
            themeIcon.className = 'ph ph-moon';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('transitOpsTheme', isLight ? 'light' : 'dark');
            if (themeIcon) {
                themeIcon.className = isLight ? 'ph ph-moon' : 'ph ph-sun';
            }
        });
    }

    // 7. Global Search Implementation with RBAC
    const searchInput = document.getElementById('globalSearchInput');
    const resultsDiv = document.getElementById('globalSearchResults');

    if (searchInput && resultsDiv) {
        let debounceTimer;

        const API_BASE_URL = (() => {
            const { origin } = window.location;
            if (origin.includes(':5005')) return '/api/v1';
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) return 'http://localhost:5005/api/v1';
            return '/api/v1';
        })();

        const authenticatedFetchLocal = async (endpoint) => {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            };
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
            if (response.status === 401) {
                localStorage.removeItem('transitOpsUser');
                window.location.href = 'login.html';
                return [];
            }
            const result = await response.json();
            if (!response.ok) return [];
            return result.data !== undefined ? result.data : result;
        };

        // Close search results overlay when clicking elsewhere on the page
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
                resultsDiv.style.display = 'none';
            }
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                resultsDiv.style.display = 'block';
            }
        });

        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = searchInput.value.trim().toLowerCase();
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                resultsDiv.innerHTML = '';
                return;
            }

            debounceTimer = setTimeout(async () => {
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = '<div class="global-search-no-results">Searching...</div>';

                try {
                    const userRole = user.role;
                    const canSeeVehicles = userRole === 'manager' || userRole === 'admin';
                    const canSeeDrivers = userRole === 'manager' || userRole === 'safety' || userRole === 'admin';
                    const canSeeTrips = userRole === 'manager' || userRole === 'driver' || userRole === 'dispatcher' || userRole === 'admin';
                    const canSeeMaintenance = userRole === 'manager' || userRole === 'admin';
                    const canSeeExpenses = userRole === 'manager' || userRole === 'finance' || userRole === 'admin';

                    const fetchPromises = [];
                    const categories = [];

                    if (canSeeVehicles) {
                        fetchPromises.push(authenticatedFetchLocal('/vehicles'));
                        categories.push('vehicles');
                    }
                    if (canSeeDrivers) {
                        fetchPromises.push(authenticatedFetchLocal('/drivers'));
                        categories.push('drivers');
                    }
                    if (canSeeTrips) {
                        fetchPromises.push(authenticatedFetchLocal('/trips'));
                        categories.push('trips');
                    }
                    if (canSeeMaintenance) {
                        fetchPromises.push(authenticatedFetchLocal('/maintenance'));
                        categories.push('maintenance');
                    }
                    if (canSeeExpenses) {
                        fetchPromises.push(authenticatedFetchLocal('/expenses'));
                        categories.push('expenses');
                    }

                    const fetchResults = await Promise.all(fetchPromises);
                    const matches = {
                        vehicles: [],
                        drivers: [],
                        trips: [],
                        maintenance: [],
                        expenses: []
                    };

                    categories.forEach((cat, idx) => {
                        const data = fetchResults[idx] || [];
                        if (cat === 'vehicles') {
                            matches.vehicles = data.filter(v => 
                                (v.registration_number && v.registration_number.toLowerCase().includes(query)) || 
                                (v.model && v.model.toLowerCase().includes(query))
                            );
                        } else if (cat === 'drivers') {
                            matches.drivers = data.filter(d => 
                                (d.name && d.name.toLowerCase().includes(query)) || 
                                (d.license_number && d.license_number.toLowerCase().includes(query))
                            );
                        } else if (cat === 'trips') {
                            matches.trips = data.filter(t => 
                                (t.source && t.source.toLowerCase().includes(query)) || 
                                (t.destination && t.destination.toLowerCase().includes(query)) ||
                                (t.driver_name && t.driver_name.toLowerCase().includes(query)) ||
                                (t.registration_number && t.registration_number.toLowerCase().includes(query))
                            );
                        } else if (cat === 'maintenance') {
                            matches.maintenance = data.filter(m => 
                                (m.description && m.description.toLowerCase().includes(query)) || 
                                (m.status && m.status.toLowerCase().includes(query)) ||
                                (m.registration_number && m.registration_number.toLowerCase().includes(query))
                            );
                        } else if (cat === 'expenses') {
                            matches.expenses = data.filter(e => 
                                (e.type && e.type.toLowerCase().includes(query)) || 
                                String(e.cost).includes(query) ||
                                (e.registration_number && e.registration_number.toLowerCase().includes(query))
                            );
                        }
                    });

                    let html = '';
                    let totalMatches = 0;

                    if (matches.vehicles.length > 0) {
                        totalMatches += matches.vehicles.length;
                        html += `
                            <div class="global-search-group">
                                <div class="global-search-group-title"><i class="ph ph-car"></i> Vehicles</div>
                        `;
                        matches.vehicles.slice(0, 3).forEach(v => {
                            html += `
                                <div class="global-search-item" onclick="window.location.href='vehicles.html?search=${encodeURIComponent(v.registration_number)}'">
                                    <div class="item-left">
                                        <span class="item-title">${v.registration_number}</span>
                                        <span class="item-subtitle">${v.model} (${v.status})</span>
                                    </div>
                                    <i class="ph ph-caret-right text-muted"></i>
                                </div>
                            `;
                        });
                        html += '</div>';
                    }

                    if (matches.drivers.length > 0) {
                        totalMatches += matches.drivers.length;
                        html += `
                            <div class="global-search-group">
                                <div class="global-search-group-title"><i class="ph ph-identification-card"></i> Drivers</div>
                        `;
                        matches.drivers.slice(0, 3).forEach(d => {
                            html += `
                                <div class="global-search-item" onclick="window.location.href='drivers.html?search=${encodeURIComponent(d.name)}'">
                                    <div class="item-left">
                                        <span class="item-title">${d.name}</span>
                                        <span class="item-subtitle">DL: ${d.license_number} (${d.status})</span>
                                    </div>
                                    <i class="ph ph-caret-right text-muted"></i>
                                </div>
                            `;
                        });
                        html += '</div>';
                    }

                    if (matches.trips.length > 0) {
                        totalMatches += matches.trips.length;
                        html += `
                            <div class="global-search-group">
                                <div class="global-search-group-title"><i class="ph ph-path"></i> Trips</div>
                        `;
                        matches.trips.slice(0, 3).forEach(t => {
                            html += `
                                <div class="global-search-item" onclick="window.location.href='trips.html?search=${encodeURIComponent(t.source)}'">
                                    <div class="item-left">
                                        <span class="item-title">${t.source} &rarr; ${t.destination}</span>
                                        <span class="item-subtitle">Cargo: ${t.cargo_weight} kg (${t.status})</span>
                                    </div>
                                    <i class="ph ph-caret-right text-muted"></i>
                                </div>
                            `;
                        });
                        html += '</div>';
                    }

                    if (matches.maintenance.length > 0) {
                        totalMatches += matches.maintenance.length;
                        html += `
                            <div class="global-search-group">
                                <div class="global-search-group-title"><i class="ph ph-wrench"></i> Maintenance</div>
                        `;
                        matches.maintenance.slice(0, 3).forEach(m => {
                            const reg = m.registration_number || `Vehicle #${m.vehicle_id}`;
                            html += `
                                <div class="global-search-item" onclick="window.location.href='maintenance.html'">
                                    <div class="item-left">
                                        <span class="item-title">${reg} - ${m.description}</span>
                                        <span class="item-subtitle">Cost: $${m.cost} (${m.status})</span>
                                    </div>
                                    <i class="ph ph-caret-right text-muted"></i>
                                </div>
                            `;
                        });
                        html += '</div>';
                    }

                    if (matches.expenses.length > 0) {
                        totalMatches += matches.expenses.length;
                        html += `
                            <div class="global-search-group">
                                <div class="global-search-group-title"><i class="ph ph-receipt"></i> Fuel & Expenses</div>
                        `;
                        matches.expenses.slice(0, 3).forEach(e => {
                            const reg = e.registration_number || `Vehicle #${e.vehicle_id}`;
                            html += `
                                <div class="global-search-item" onclick="window.location.href='expenses.html'">
                                    <div class="item-left">
                                        <span class="item-title">${reg} - ${e.type}</span>
                                        <span class="item-subtitle">Cost: $${e.cost} (${new Date(e.logged_at).toLocaleDateString()})</span>
                                    </div>
                                    <i class="ph ph-caret-right text-muted"></i>
                                </div>
                            `;
                        });
                        html += '</div>';
                    }

                    if (totalMatches === 0) {
                        resultsDiv.innerHTML = '<div class="global-search-no-results">No matches found.</div>';
                    } else {
                        resultsDiv.innerHTML = html;
                    }
                } catch (err) {
                    console.error('[Global Search Error]', err);
                    resultsDiv.innerHTML = '<div class="global-search-no-results" style="color: var(--status-red);">Failed to retrieve search results.</div>';
                }
            }, 250);
        });
    }
});
