document.addEventListener('DOMContentLoaded', () => {
    // 1. Get User Session Data
    const userData = localStorage.getItem('transitOpsUser');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userData);

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

    // 3. Fetch, Compute and Filter KPIs based on Active Filters
    let allVehicles = [];
    let allDrivers = [];
    let allTrips = [];

    const getRegion = (locationStr) => {
        if (!locationStr) return '';
        const match = locationStr.match(/\(([^)]+)\)/);
        if (match) return match[1].trim();
        const parts = locationStr.split(' ');
        return parts[parts.length - 1].trim();
    };

    const computeAndRenderDashboard = () => {
        const filterTypeVal = document.getElementById('filterType').value;
        const filterStatusVal = document.getElementById('filterStatus').value;
        const filterRegionVal = document.getElementById('filterRegion').value;

        // Filter vehicles
        let filteredVehicles = allVehicles;
        if (filterTypeVal !== 'all') {
            filteredVehicles = filteredVehicles.filter(v => v.type === filterTypeVal);
        }
        if (filterStatusVal !== 'all') {
            filteredVehicles = filteredVehicles.filter(v => v.status === filterStatusVal);
        }
        if (filterRegionVal !== 'all') {
            filteredVehicles = filteredVehicles.filter(v => {
                const vehicleTrips = allTrips.filter(t => t.vehicle_id === v.id);
                return vehicleTrips.some(t => getRegion(t.source) === filterRegionVal || getRegion(t.destination) === filterRegionVal);
            });
        }

        const totalVehicles = filteredVehicles.length;
        const availableVehicles = filteredVehicles.filter(v => v.status === 'Available').length;
        const maintenanceVehicles = filteredVehicles.filter(v => v.status === 'In Shop').length;
        const activeVehiclesCount = filteredVehicles.filter(v => v.status === 'On Trip').length;
        const retiredVehicles = filteredVehicles.filter(v => v.status === 'Retired').length;

        const eligibleVehicles = totalVehicles - retiredVehicles;
        const fleetUtilization = eligibleVehicles > 0 ? ((activeVehiclesCount / eligibleVehicles) * 100).toFixed(2) : '0.00';

        // Filter trips
        let filteredTrips = allTrips;
        if (filterTypeVal !== 'all') {
            filteredTrips = filteredTrips.filter(t => {
                const v = allVehicles.find(veh => veh.id === t.vehicle_id);
                return v && v.type === filterTypeVal;
            });
        }
        if (filterStatusVal !== 'all') {
            if (filterStatusVal === 'On Trip') {
                filteredTrips = filteredTrips.filter(t => t.status === 'Dispatched');
            } else if (filterStatusVal === 'Available') {
                filteredTrips = filteredTrips.filter(t => t.status === 'Draft');
            }
        }
        if (filterRegionVal !== 'all') {
            filteredTrips = filteredTrips.filter(t => getRegion(t.source) === filterRegionVal || getRegion(t.destination) === filterRegionVal);
        }

        const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length;
        const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft').length;

        // Filter drivers
        let filteredDrivers = allDrivers;
        if (filterRegionVal !== 'all') {
            filteredDrivers = filteredDrivers.filter(d => {
                const driverTrips = allTrips.filter(t => t.driver_id === d.id);
                return driverTrips.some(t => getRegion(t.source) === filterRegionVal || getRegion(t.destination) === filterRegionVal);
            });
        }
        const activeDriversCount = filteredDrivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length;

        // Render KPIs
        const totalVehiclesEl = document.getElementById('kpiTotalVehicles');
        const availableVehiclesEl = document.getElementById('kpiAvailableVehicles');
        const maintenanceVehiclesEl = document.getElementById('kpiMaintenanceVehicles');
        const activeTripsEl = document.getElementById('kpiActiveTrips');
        const pendingTripsEl = document.getElementById('kpiPendingTrips');
        const activeDriversEl = document.getElementById('kpiActiveDrivers');
        const utilizationEl = document.getElementById('kpiUtilization');

        if (totalVehiclesEl) totalVehiclesEl.textContent = totalVehicles;
        if (availableVehiclesEl) availableVehiclesEl.textContent = availableVehicles;
        if (maintenanceVehiclesEl) maintenanceVehiclesEl.textContent = maintenanceVehicles;
        if (activeTripsEl) activeTripsEl.textContent = activeTripsCount;
        if (pendingTripsEl) pendingTripsEl.textContent = pendingTripsCount;
        if (activeDriversEl) activeDriversEl.textContent = activeDriversCount;
        if (utilizationEl) utilizationEl.textContent = `${fleetUtilization}%`;

        // Update Vehicle Status Bars
        const barAvailable = document.getElementById('bar-available');
        const barOnTrip = document.getElementById('bar-ontrip');
        const barInShop = document.getElementById('bar-inshop');
        const barRetired = document.getElementById('bar-retired');

        if (barAvailable) barAvailable.style.width = totalVehicles > 0 ? `${(availableVehicles / totalVehicles) * 100}%` : '0%';
        if (barOnTrip) barOnTrip.style.width = totalVehicles > 0 ? `${(activeVehiclesCount / totalVehicles) * 100}%` : '0%';
        if (barInShop) barInShop.style.width = totalVehicles > 0 ? `${(maintenanceVehicles / totalVehicles) * 100}%` : '0%';
        if (barRetired) barRetired.style.width = totalVehicles > 0 ? `${(retiredVehicles / totalVehicles) * 100}%` : '0%';

        renderRecentTripsList(filteredTrips);
    };

    const renderRecentTripsList = (tripsList) => {
        const tableBody = document.getElementById('recentTripsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (tripsList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1rem;">No trips registered matching criteria.</td>
                </tr>
            `;
            return;
        }

        const recentTrips = tripsList.slice(-5).reverse();
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
                <td class="num-col" style="padding: 1rem;">${trip.cargo_weight} kg</td>
                <td style="padding: 1rem;"><span style="background-color: ${badgeColor}; padding: 0.25rem 1rem; border-radius: 4px; color: ${textColor}; font-weight: 600;">${trip.status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    };

    const populateFilters = () => {
        const typeSelect = document.getElementById('filterType');
        const statusSelect = document.getElementById('filterStatus');
        const regionSelect = document.getElementById('filterRegion');

        if (!typeSelect || !statusSelect || !regionSelect) return;

        // Vehicle Types
        const uniqueTypes = [...new Set(allVehicles.map(v => v.type))].filter(Boolean);
        typeSelect.innerHTML = '<option value="all">Vehicle Type: All</option>';
        uniqueTypes.forEach(t => {
            typeSelect.innerHTML += `<option value="${t}">${t}</option>`;
        });

        // Vehicle Statuses
        const uniqueStatuses = [...new Set(allVehicles.map(v => v.status))].filter(Boolean);
        statusSelect.innerHTML = '<option value="all">Status: All</option>';
        uniqueStatuses.forEach(s => {
            statusSelect.innerHTML += `<option value="${s}">${s}</option>`;
        });

        // Regions from Trips
        const regionsSet = new Set();
        allTrips.forEach(t => {
            const regS = getRegion(t.source);
            const regD = getRegion(t.destination);
            if (regS) regionsSet.add(regS);
            if (regD) regionsSet.add(regD);
        });
        const uniqueRegions = [...regionsSet].filter(Boolean);
        regionSelect.innerHTML = '<option value="all">Region: All</option>';
        uniqueRegions.forEach(r => {
            regionSelect.innerHTML += `<option value="${r}">${r}</option>`;
        });

        typeSelect.addEventListener('change', computeAndRenderDashboard);
        statusSelect.addEventListener('change', computeAndRenderDashboard);
        regionSelect.addEventListener('change', computeAndRenderDashboard);
    };

    const loadDashboardData = async () => {
        try {
            const [vehicles, drivers, trips] = await Promise.all([
                authenticatedFetch('/vehicles'),
                authenticatedFetch('/drivers'),
                authenticatedFetch('/trips')
            ]);

            allVehicles = vehicles;
            allDrivers = drivers;
            allTrips = trips;

            populateFilters();
            computeAndRenderDashboard();
        } catch (error) {
            console.error('[Dashboard Data Load Failure]', error);
        }
    };

    // Run loader tasks
    loadHealthStatus();
    loadDashboardData();
});
