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

    // UI elements
    const tableBody = document.getElementById('tripsTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const tripModal = document.getElementById('tripModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const tripForm = document.getElementById('tripForm');
    const modalTitle = document.getElementById('modalTitle');
    const vehicleSelect = document.getElementById('vehicleSelect');
    const driverSelect = document.getElementById('driverSelect');

    // Authenticated API request
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

    // Check RBAC permissions for Add/Edit/Delete
    const hasWritePermission = user.role === 'manager' || user.role === 'driver' || user.role === 'admin';
    const hasDeletePermission = user.role === 'manager' || user.role === 'admin';
    
    if (!hasWritePermission && openAddModalBtn) {
        openAddModalBtn.style.display = 'none';
    }

    // Cache vehicles & drivers to display names/registration details in the table grid
    let vehiclesCache = [];
    let driversCache = [];
    let allTrips = [];

    // Helper: populate select dropdowns
    const populateDropdowns = () => {
        if (!vehicleSelect || !driverSelect) return;
        
        vehicleSelect.innerHTML = '<option value="">Choose a vehicle...</option>';
        vehiclesCache.forEach(v => {
            if (v.status === 'Available' || v.status === 'On Trip') {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = `${v.registration_number} - ${v.model} (${v.status})`;
                vehicleSelect.appendChild(opt);
            }
        });

        driverSelect.innerHTML = '<option value="">Choose a driver...</option>';
        driversCache.forEach(d => {
            if (d.status === 'Available' || d.status === 'On Trip') {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `${d.name} (Safety Score: ${d.safety_score}%)`;
                driverSelect.appendChild(opt);
            }
        });
    };

    const loadMetaData = async () => {
        try {
            vehiclesCache = await authenticatedFetch('/vehicles');
            driversCache = await authenticatedFetch('/drivers');
            populateDropdowns();
        } catch (error) {
            console.error('[Metadata Load Failure]', error);
        }
    };

    // Load and render trips
    const loadTrips = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Loading manifest...</td></tr>';
            
            // Make sure we have vehicle and driver caches loaded first
            if (vehiclesCache.length === 0 || driversCache.length === 0) {
                await loadMetaData();
            }

            allTrips = await authenticatedFetch('/trips');
            renderTrips(allTrips);
        } catch (error) {
            console.error('[Load Trips Error]', error);
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger-color);">Failed to load manifest.</td></tr>';
        }
    };

    const renderTrips = (tripsList) => {
        tableBody.innerHTML = '';
        if (tripsList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No trips registered in manifest.</td></tr>';
            return;
        }

        tripsList.forEach(t => {
            let badgeClass = 'badge-info';
            if (t.status === 'Completed') badgeClass = 'badge-success';
            if (t.status === 'Cancelled') badgeClass = 'badge-danger';
            if (t.status === 'Draft') badgeClass = 'badge-warning';

            // Find associated model/registration details from cache
            const vehicle = vehiclesCache.find(v => v.id === t.vehicle_id);
            const driver = driversCache.find(d => d.id === t.driver_id);

            const vehicleText = vehicle ? `${vehicle.registration_number} <br><small style="color:var(--text-muted)">${vehicle.model}</small>` : 'Unallocated';
            const driverText = driver ? driver.name : 'Unassigned';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${t.id}</strong></td>
                <td>
                    <div><strong>From:</strong> ${t.source}</div>
                    <div><strong>To:</strong> ${t.destination}</div>
                </td>
                <td>${vehicleText}</td>
                <td>${driverText}</td>
                <td>${t.cargo_weight} kg</td>
                <td>
                    <div>${t.planned_distance} km</div>
                    <small style="color: var(--secondary-color); font-weight:700;">$${parseFloat(t.revenue).toLocaleString()}</small>
                </td>
                <td><span class="badge ${badgeClass}">${t.status}</span></td>
                <td>
                    ${hasWritePermission ? `
                        <button class="btn btn-sm edit-btn" data-id="${t.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); margin-right: 0.5rem;">Edit</button>
                        ${hasDeletePermission ? `
                            <button class="btn btn-sm delete-btn" data-id="${t.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); color: var(--danger-color);">Delete</button>
                        ` : ''}
                    ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Read-only</span>'}
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Event listeners for operations
        if (hasWritePermission) {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
            });
        }
        if (hasDeletePermission) {
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteTrip(btn.getAttribute('data-id')));
            });
        }
    };

    // Search and Filter handlers
    const filterAndSearch = () => {
        const query = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = allTrips.filter(t => {
            const matchesSearch = t.source.toLowerCase().includes(query) || t.destination.toLowerCase().includes(query);
            const matchesStatus = !selectedStatus || t.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });

        renderTrips(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSearch);
    if (statusFilter) statusFilter.addEventListener('change', filterAndSearch);

    // Modal display control
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            modalTitle.textContent = 'Create New Dispatch Trip';
            tripForm.reset();
            document.getElementById('tripId').value = '';
            
            // Force dropdown reload to catch any status updates
            loadMetaData();
            
            tripModal.classList.add('show');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            tripModal.classList.remove('show');
        });
    }

    const openEditModal = async (id) => {
        try {
            await loadMetaData(); // Refresh options
            const trip = await authenticatedFetch(`/trips/${id}`);
            modalTitle.textContent = 'Edit Dispatch Details';
            
            document.getElementById('tripId').value = trip.id;
            document.getElementById('source').value = trip.source;
            document.getElementById('destination').value = trip.destination;
            
            // Check if vehicle/driver is in dropdown, if not temporarily add it (since they might be 'On Trip')
            let hasVehicleOption = Array.from(vehicleSelect.options).some(x => x.value == trip.vehicle_id);
            if (!hasVehicleOption && trip.vehicle_id) {
                const vehicle = vehiclesCache.find(v => v.id === trip.vehicle_id);
                if (vehicle) {
                    const opt = document.createElement('option');
                    opt.value = vehicle.id;
                    opt.textContent = `${vehicle.registration_number} - ${vehicle.model} (Allocated)`;
                    vehicleSelect.appendChild(opt);
                }
            }
            vehicleSelect.value = trip.vehicle_id;

            let hasDriverOption = Array.from(driverSelect.options).some(x => x.value == trip.driver_id);
            if (!hasDriverOption && trip.driver_id) {
                const driver = driversCache.find(d => d.id === trip.driver_id);
                if (driver) {
                    const opt = document.createElement('option');
                    opt.value = driver.id;
                    opt.textContent = `${driver.name} (Assigned)`;
                    driverSelect.appendChild(opt);
                }
            }
            driverSelect.value = trip.driver_id;

            document.getElementById('cargoWeight').value = trip.cargo_weight;
            document.getElementById('plannedDistance').value = trip.planned_distance;
            document.getElementById('revenue').value = trip.revenue;
            document.getElementById('status').value = trip.status;

            tripModal.classList.add('show');
        } catch (error) {
            alert('Failed to retrieve trip details.');
        }
    };

    // Form submit handler
    if (tripForm) {
        tripForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('tripId').value;
            const payload = {
                source: document.getElementById('source').value,
                destination: document.getElementById('destination').value,
                vehicle_id: parseInt(document.getElementById('vehicleSelect').value, 10),
                driver_id: parseInt(document.getElementById('driverSelect').value, 10),
                cargo_weight: parseFloat(document.getElementById('cargoWeight').value),
                planned_distance: parseFloat(document.getElementById('plannedDistance').value),
                revenue: parseFloat(document.getElementById('revenue').value),
                status: document.getElementById('status').value
            };

            try {
                if (id) {
                    await authenticatedFetch(`/trips/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    await authenticatedFetch('/trips', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }
                tripModal.classList.remove('show');
                loadTrips();
            } catch (error) {
                alert(error.message || 'Error occurred while saving trip.');
            }
        });
    }

    // Delete trip handler
    const deleteTrip = async (id) => {
        if (confirm('Are you sure you want to delete this trip dispatch manifest record?')) {
            try {
                await authenticatedFetch(`/trips/${id}`, {
                    method: 'DELETE'
                });
                loadTrips();
            } catch (error) {
                alert(error.message || 'Failed to delete trip.');
            }
        }
    };

    // Initializer call
    loadTrips();
});
