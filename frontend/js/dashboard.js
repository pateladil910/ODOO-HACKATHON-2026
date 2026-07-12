document.addEventListener('DOMContentLoaded', () => {
    // 1. Get User Session Data
    const userData = localStorage.getItem('transitOpsUser');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userData);

    // Populate role badge
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
        // Format role (e.g. fleet_manager -> Fleet Manager)
        roleBadge.innerHTML = `${user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')} <div class="header-user-avatar">${user.email.charAt(0).toUpperCase()}</div>`;
    }
    const userNameEl = document.querySelector('.header-user-name');
    if (userNameEl) {
        userNameEl.textContent = user.email.split('@')[0];
    }

    // Dynamic API URL detection
    const getApiBaseUrl = () => {
        const { origin } = window.location;
        if (origin.includes(':5005')) {
            return '/api/v1';
        }
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return 'http://localhost:5005/api/v1';
        }
        return '/api/v1';
    };

    const API_BASE_URL = getApiBaseUrl();

    // Authenticated API Request Wrapper
    const authenticatedFetch = async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            ...options.headers
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('transitOpsUser');
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        return result.data !== undefined ? result.data : result;
    };

    // 2. Fetch and Render Health Status
    const loadHealthStatus = async () => {
        const apiStatus = document.getElementById('apiStatusBadge');
        const dbStatus = document.getElementById('dbStatusBadge');

        try {
            const healthRes = await fetch(`${API_BASE_URL.replace('/api/v1', '/api/v1/health')}`);
            const health = await healthRes.json();
            
            if (healthRes.ok) {
                if (apiStatus) {
                    apiStatus.className = 'badge badge-success';
                    apiStatus.textContent = 'API ONLINE';
                }
            } else {
                if (apiStatus) {
                    apiStatus.className = 'badge badge-danger';
                    apiStatus.textContent = 'API ERROR';
                }
            }

            if (health.database === 'CONNECTED') {
                if (dbStatus) {
                    dbStatus.className = 'badge badge-success';
                    dbStatus.textContent = 'DB CONNECTED';
                }
            } else {
                if (dbStatus) {
                    dbStatus.className = 'badge badge-danger';
                    dbStatus.textContent = 'DB OFFLINE';
                }
            }
        } catch (error) {
            console.error('[Health Check Failure]', error);
            if (apiStatus) {
                apiStatus.className = 'badge badge-danger';
                apiStatus.textContent = 'API OFFLINE';
            }
            if (dbStatus) {
                dbStatus.className = 'badge badge-danger';
                dbStatus.textContent = 'DB OFFLINE';
            }
        }
    };

    // 3. Fetch and Render KPIs
    const loadKPIs = async () => {
        try {
            const kpis = await authenticatedFetch('/analytics/kpis');
            
            const totalVehiclesEl = document.getElementById('kpiTotalVehicles');
            const availableVehiclesEl = document.getElementById('kpiAvailableVehicles');
            const maintenanceVehiclesEl = document.getElementById('kpiMaintenanceVehicles');
            
            const activeTripsEl = document.getElementById('kpiActiveTrips');
            const pendingTripsEl = document.getElementById('kpiPendingTrips');
            
            const activeDriversEl = document.getElementById('kpiActiveDrivers');
            const utilizationEl = document.getElementById('kpiUtilization');

            if (totalVehiclesEl) totalVehiclesEl.textContent = kpis.vehicles.total;
            if (availableVehiclesEl) availableVehiclesEl.textContent = kpis.vehicles.available;
            if (maintenanceVehiclesEl) maintenanceVehiclesEl.textContent = kpis.vehicles.maintenance;
            
            if (activeTripsEl) activeTripsEl.textContent = kpis.trips.dispatched;
            if (pendingTripsEl) pendingTripsEl.textContent = kpis.trips.draft;
            
            if (activeDriversEl) activeDriversEl.textContent = kpis.drivers.active;
            if (utilizationEl) utilizationEl.textContent = `${kpis.vehicles.utilization_percentage}%`;

            // Update Vehicle Status Bars Animation Dynamically
            const total = kpis.vehicles.total;
            const barAvailable = document.getElementById('bar-available');
            const barOnTrip = document.getElementById('bar-ontrip');
            const barInShop = document.getElementById('bar-inshop');
            const barRetired = document.getElementById('bar-retired');

            setTimeout(() => {
                if (barAvailable) barAvailable.style.width = total > 0 ? `${(kpis.vehicles.available / total) * 100}%` : '0%';
                if (barOnTrip) barOnTrip.style.width = total > 0 ? `${(kpis.vehicles.active / total) * 100}%` : '0%';
                if (barInShop) barInShop.style.width = total > 0 ? `${(kpis.vehicles.maintenance / total) * 100}%` : '0%';
                if (barRetired) barRetired.style.width = total > 0 ? `${(kpis.vehicles.retired / total) * 100}%` : '0%';
            }, 100);

        } catch (error) {
            console.error('[KPI Load Failure]', error);
        }
    };

    // 4. Fetch and Render Recent Trips
    const loadRecentTrips = async () => {
        const tableBody = document.getElementById('recentTripsTableBody');
        if (!tableBody) return;
        try {
            const trips = await authenticatedFetch('/trips');
            tableBody.innerHTML = '';

            if (trips.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1rem;">No trips registered yet.</td>
                    </tr>
                `;
                return;
            }

            // Get last 5 trips
            const recentTrips = trips.slice(-5).reverse();
            recentTrips.forEach(trip => {
                let badgeColor = '#6b7280'; // Draft
                let textColor = 'white';
                if (trip.status === 'Completed') badgeColor = 'var(--secondary-color)';
                if (trip.status === 'Cancelled') badgeColor = 'var(--danger-color)';
                if (trip.status === 'On Trip' || trip.status === 'In Progress' || trip.status === 'Dispatched') badgeColor = 'var(--primary-color)';

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 1rem;">TR${String(trip.id).padStart(3, '0')}</td>
                    <td style="padding: 1rem;">${trip.source}</td>
                    <td style="padding: 1rem;">${trip.destination}</td>
                    <td style="padding: 1rem;">${trip.cargo_weight} kg</td>
                    <td style="padding: 1rem;"><span style="background-color: ${badgeColor}; padding: 0.25rem 1rem; border-radius: 4px; color: ${textColor}; font-weight: 600;">${trip.status}</span></td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('[Trips Load Failure]', error);
        }
    };

    // Run loader tasks
    loadHealthStatus();
    loadKPIs();
    loadRecentTrips();
});
