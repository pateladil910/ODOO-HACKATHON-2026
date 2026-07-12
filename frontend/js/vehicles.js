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
    const tableBody = document.getElementById('vehiclesTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const vehicleModal = document.getElementById('vehicleModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const vehicleForm = document.getElementById('vehicleForm');
    const modalTitle = document.getElementById('modalTitle');

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
    const hasWritePermission = user.role === 'manager' || user.role === 'admin';
    if (!hasWritePermission && openAddModalBtn) {
        openAddModalBtn.style.display = 'none';
    }

    // Load and render vehicles
    let allVehicles = [];
    const loadVehicles = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading fleet registry...</td></tr>';
            allVehicles = await authenticatedFetch('/vehicles');
            renderVehicles(allVehicles);
        } catch (error) {
            console.error('[Load Vehicles Error]', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Failed to load vehicles.</td></tr>';
        }
    };

    const renderVehicles = (vehiclesList) => {
        tableBody.innerHTML = '';
        if (vehiclesList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No vehicles found matching criteria.</td></tr>';
            return;
        }

        vehiclesList.forEach(v => {
            let badgeClass = 'badge-info';
            if (v.status === 'Available') badgeClass = 'badge-success';
            if (v.status === 'Retired') badgeClass = 'badge-danger';
            if (v.status === 'In Shop') badgeClass = 'badge-warning';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${v.registration_number}</strong></td>
                <td>
                    <div>${v.model}</div>
                    <small style="color: var(--text-muted); font-size: 0.75rem;">${v.type}</small>
                </td>
                <td>${v.max_capacity} kg</td>
                <td>${parseFloat(v.odometer).toLocaleString()} km</td>
                <td><span class="badge ${badgeClass}">${v.status}</span></td>
                <td>
                    ${hasWritePermission ? `
                        <button class="btn btn-sm edit-btn" data-id="${v.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); margin-right: 0.5rem;">Edit</button>
                        <button class="btn btn-sm delete-btn" data-id="${v.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); color: var(--danger-color);">Delete</button>
                    ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Read-only</span>'}
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Attach event listeners to buttons
        if (hasWritePermission) {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteVehicle(btn.getAttribute('data-id')));
            });
        }
    };

    // Filter and Search Event Handlers
    const filterAndSearch = () => {
        const query = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = allVehicles.filter(v => {
            const matchesSearch = v.registration_number.toLowerCase().includes(query) || v.model.toLowerCase().includes(query);
            const matchesStatus = !selectedStatus || v.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });

        renderVehicles(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSearch);
    if (statusFilter) statusFilter.addEventListener('change', filterAndSearch);

    // Modal Control Logic
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            modalTitle.textContent = 'Register New Vehicle';
            vehicleForm.reset();
            document.getElementById('vehicleId').value = '';
            document.getElementById('regNumber').disabled = false;
            vehicleModal.classList.add('show');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            vehicleModal.classList.remove('show');
        });
    }

    const openEditModal = async (id) => {
        try {
            const vehicle = await authenticatedFetch(`/vehicles/${id}`);
            modalTitle.textContent = 'Edit Vehicle Details';
            
            document.getElementById('vehicleId').value = vehicle.id;
            document.getElementById('regNumber').value = vehicle.registration_number;
            document.getElementById('regNumber').disabled = true; // Cannot edit registration identifier
            document.getElementById('model').value = vehicle.model;
            document.getElementById('type').value = vehicle.type;
            document.getElementById('capacity').value = vehicle.max_capacity;
            document.getElementById('odometer').value = vehicle.odometer;
            document.getElementById('cost').value = vehicle.acquisition_cost;
            document.getElementById('status').value = vehicle.status;

            vehicleModal.classList.add('show');
        } catch (error) {
            alert('Failed to retrieve vehicle details.');
        }
    };

    // Submit form handler (Add / Edit)
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('vehicleId').value;
            const payload = {
                registration_number: document.getElementById('regNumber').value,
                model: document.getElementById('model').value,
                type: document.getElementById('type').value,
                max_capacity: parseFloat(document.getElementById('capacity').value),
                odometer: parseFloat(document.getElementById('odometer').value),
                acquisition_cost: parseFloat(document.getElementById('cost').value),
                status: document.getElementById('status').value
            };

            try {
                if (id) {
                    // Update existing
                    await authenticatedFetch(`/vehicles/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    // Register new
                    await authenticatedFetch('/vehicles', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }
                vehicleModal.classList.remove('show');
                loadVehicles(); // Refresh table list
            } catch (error) {
                alert(error.message || 'Error occurred while saving vehicle.');
            }
        });
    }

    // Delete vehicle handler
    const deleteVehicle = async (id) => {
        if (confirm('Are you sure you want to retire or delete this vehicle from registry?')) {
            try {
                await authenticatedFetch(`/vehicles/${id}`, {
                    method: 'DELETE'
                });
                loadVehicles(); // Refresh list
            } catch (error) {
                alert(error.message || 'Failed to delete vehicle.');
            }
        }
    };

    // Initialize list
    loadVehicles();
});
