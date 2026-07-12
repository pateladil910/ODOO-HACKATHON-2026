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
        roleBadge.textContent = user.role;
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
                apiStatus.className = 'badge badge-success';
                apiStatus.textContent = 'ONLINE';
            } else {
                apiStatus.className = 'badge badge-danger';
                apiStatus.textContent = 'ERROR';
            }

            if (health.database === 'CONNECTED') {
                dbStatus.className = 'badge badge-success';
                dbStatus.textContent = 'CONNECTED';
            } else {
                dbStatus.className = 'badge badge-danger';
                dbStatus.textContent = 'DISCONNECTED';
            }
        } catch (error) {
            console.error('[Health Check Failure]', error);
            apiStatus.className = 'badge badge-danger';
            apiStatus.textContent = 'OFFLINE';
            dbStatus.className = 'badge badge-danger';
            dbStatus.textContent = 'OFFLINE';
        }
    };

    // 3. Fetch and Render KPIs
    const loadKPIs = async () => {
        try {
            const kpis = await authenticatedFetch('/analytics/kpis');
            
            document.getElementById('kpiTotalVehicles').textContent = kpis.vehicles.total;
            document.getElementById('kpiActiveDrivers').textContent = kpis.drivers.active;
            document.getElementById('kpiActiveTrips').textContent = kpis.trips.dispatched;
            document.getElementById('kpiUtilization').textContent = `${kpis.vehicles.utilization_percentage}%`;
        } catch (error) {
            console.error('[KPI Load Failure]', error);
            document.getElementById('kpiTotalVehicles').textContent = 'Error';
            document.getElementById('kpiActiveDrivers').textContent = 'Error';
            document.getElementById('kpiActiveTrips').textContent = 'Error';
            document.getElementById('kpiUtilization').textContent = 'Error';
        }
    };

    // 4. Fetch and Render Recent Trips
    const loadRecentTrips = async () => {
        const tableBody = document.getElementById('recentTripsTableBody');
        try {
            const trips = await authenticatedFetch('/trips');
            tableBody.innerHTML = '';

            if (trips.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: var(--text-muted);">No trips registered yet.</td>
                    </tr>
                `;
                return;
            }

            // Get last 5 trips
            const recentTrips = trips.slice(-5).reverse();
            recentTrips.forEach(trip => {
                let badgeClass = 'badge-info';
                if (trip.status === 'Completed') badgeClass = 'badge-success';
                if (trip.status === 'Cancelled') badgeClass = 'badge-danger';
                if (trip.status === 'Draft') badgeClass = 'badge-warning';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${trip.id}</td>
                    <td>${trip.source}</td>
                    <td>${trip.destination}</td>
                    <td>${trip.cargo_weight} kg</td>
                    <td><span class="badge ${badgeClass}">${trip.status}</span></td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('[Trips Load Failure]', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--danger-color);">Failed to load recent trips.</td>
                </tr>
            `;
        }
    };

    // Run loader tasks
    loadHealthStatus();
    loadKPIs();
    loadRecentTrips();
});
