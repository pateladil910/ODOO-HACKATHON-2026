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

    // 2. Fetch and Render KPIs
    const loadKPIs = async () => {
        try {
            const kpis = await authenticatedFetch('/analytics/kpis');
            
            if (document.getElementById('kpiTotalVehicles')) document.getElementById('kpiTotalVehicles').textContent = kpis.vehicles.total;
            if (document.getElementById('kpiActiveDrivers')) document.getElementById('kpiActiveDrivers').textContent = kpis.drivers.active;
            if (document.getElementById('kpiActiveTrips')) document.getElementById('kpiActiveTrips').textContent = kpis.trips.dispatched;
            if (document.getElementById('kpiUtilization')) document.getElementById('kpiUtilization').textContent = `${kpis.vehicles.utilization_percentage}%`;
        } catch (error) {
            console.error('[KPI Load Failure]', error);
        }
    };

    // 3. Fetch and Render Recent Trips
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
                if (trip.status === 'On Trip' || trip.status === 'In Progress') badgeColor = 'var(--primary-color)';
                if (trip.status === 'Dispatched') { badgeColor = '#60a5fa'; textColor = 'black'; }

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 1rem;">TR${String(trip.id).padStart(3, '0')}</td>
                    <td style="padding: 1rem;">${trip.vehicle_id || '—'}</td>
                    <td style="padding: 1rem;">${trip.driver_id || '—'}</td>
                    <td style="padding: 1rem;"><span style="background-color: ${badgeColor}; padding: 0.25rem 1rem; border-radius: 4px; color: ${textColor};">${trip.status}</span></td>
                    <td style="padding: 1rem;">${trip.eta || '—'}</td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('[Trips Load Failure]', error);
        }
    };

    // 4. Vehicle Status Bars Animation
    const updateVehicleStatusBars = () => {
        const data = {
            available: 42,
            onTrip: 53,
            inShop: 5,
            retired: 0 
        };
        const total = data.available + data.onTrip + data.inShop + data.retired;

        const availablePct = total > 0 ? (data.available / total) * 100 : 0;
        const onTripPct = total > 0 ? (data.onTrip / total) * 100 : 0;
        const inShopPct = total > 0 ? (data.inShop / total) * 100 : 0;
        const retiredPct = total > 0 ? (data.retired / total) * 100 : 0;

        setTimeout(() => {
            const barAvailable = document.getElementById('bar-available');
            const barOnTrip = document.getElementById('bar-ontrip');
            const barInShop = document.getElementById('bar-inshop');
            const barRetired = document.getElementById('bar-retired');

            if (barAvailable) barAvailable.style.width = `${availablePct}%`;
            if (barOnTrip) barOnTrip.style.width = `${onTripPct}%`;
            if (barInShop) barInShop.style.width = `${inShopPct}%`;
            if (barRetired) barRetired.style.width = `${retiredPct}%`;
        }, 100);
    };

    // Run loader tasks
    loadKPIs();
    loadRecentTrips();
    updateVehicleStatusBars();
});
