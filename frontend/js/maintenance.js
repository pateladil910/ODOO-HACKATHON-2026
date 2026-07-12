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
    const tableBody = document.getElementById('maintenanceTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const maintenanceModal = document.getElementById('maintenanceModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const maintenanceForm = document.getElementById('maintenanceForm');
    const modalTitle = document.getElementById('modalTitle');
    const vehicleSelect = document.getElementById('vehicleSelect');

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
    const hasDeletePermission = user.role === 'admin';

    if (!hasWritePermission && openAddModalBtn) {
        openAddModalBtn.style.display = 'none';
    }

    // Cache vehicles to map registration info
    let vehiclesCache = [];
    let allLogs = [];

    const loadMetaData = async () => {
        try {
            vehiclesCache = await authenticatedFetch('/vehicles');
            if (vehicleSelect) {
                vehicleSelect.innerHTML = '<option value="">Choose a vehicle...</option>';
                vehiclesCache.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.id;
                    opt.textContent = `${v.registration_number} - ${v.model}`;
                    vehicleSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('[Metadata Load Failure]', error);
        }
    };

    // Load and render maintenance logs
    const loadMaintenanceLogs = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading maintenance registry...</td></tr>';
            
            if (vehiclesCache.length === 0) {
                await loadMetaData();
            }

            allLogs = await authenticatedFetch('/maintenance');
            renderLogs(allLogs);
        } catch (error) {
            console.error('[Load Maintenance Logs Error]', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">Failed to load maintenance logs.</td></tr>';
        }
    };

    const renderLogs = (logsList) => {
        tableBody.innerHTML = '';
        if (logsList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No maintenance logs found.</td></tr>';
            return;
        }

        logsList.forEach(log => {
            let badgeClass = 'badge-info';
            if (log.status === 'Closed') badgeClass = 'badge-success';
            if (log.status === 'Active') badgeClass = 'badge-warning';

            const vehicle = vehiclesCache.find(v => v.id === log.vehicle_id);
            const vehicleReg = vehicle ? vehicle.registration_number : `ID: ${log.vehicle_id}`;

            const formattedDate = log.logged_at ? new Date(log.logged_at).toISOString().split('T')[0] : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${log.id}</strong></td>
                <td><strong>${vehicleReg}</strong></td>
                <td>${log.description}</td>
                <td>$${parseFloat(log.cost).toLocaleString()}</td>
                <td>${formattedDate}</td>
                <td><span class="badge ${badgeClass}">${log.status}</span></td>
                <td>
                    ${hasWritePermission ? `
                        <button class="btn btn-sm edit-btn" data-id="${log.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); margin-right: 0.5rem;">Edit</button>
                        ${hasDeletePermission ? `
                            <button class="btn btn-sm delete-btn" data-id="${log.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); color: var(--danger-color);">Delete</button>
                        ` : ''}
                    ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Read-only</span>'}
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Event listeners
        if (hasWritePermission) {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
            });
        }
        if (hasDeletePermission) {
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteLog(btn.getAttribute('data-id')));
            });
        }
    };

    // Filter and Search
    const filterAndSearch = () => {
        const query = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = allLogs.filter(log => {
            const vehicle = vehiclesCache.find(v => v.id === log.vehicle_id);
            const regNum = vehicle ? vehicle.registration_number.toLowerCase() : '';
            const matchesSearch = log.description.toLowerCase().includes(query) || regNum.includes(query);
            const matchesStatus = !selectedStatus || log.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });

        renderLogs(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSearch);
    if (statusFilter) statusFilter.addEventListener('change', filterAndSearch);

    // Modal Control
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            modalTitle.textContent = 'Log Maintenance Event';
            maintenanceForm.reset();
            document.getElementById('logId').value = '';
            document.getElementById('loggedAt').value = new Date().toISOString().split('T')[0]; // Default to today
            
            loadMetaData();
            maintenanceModal.classList.add('show');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            maintenanceModal.classList.remove('show');
        });
    }

    const openEditModal = async (id) => {
        try {
            await loadMetaData();
            const log = await authenticatedFetch(`/maintenance/${id}`);
            modalTitle.textContent = 'Edit Maintenance Record';
            
            document.getElementById('logId').value = log.id;
            document.getElementById('vehicleSelect').value = log.vehicle_id;
            document.getElementById('description').value = log.description;
            document.getElementById('cost').value = log.cost;

            const loggedAtDate = log.logged_at ? new Date(log.logged_at).toISOString().split('T')[0] : '';
            document.getElementById('loggedAt').value = loggedAtDate;
            document.getElementById('status').value = log.status;

            maintenanceModal.classList.add('show');
        } catch (error) {
            alert('Failed to retrieve maintenance details.');
        }
    };

    // Form submit
    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('logId').value;
            const payload = {
                vehicle_id: parseInt(document.getElementById('vehicleSelect').value, 10),
                description: document.getElementById('description').value,
                cost: parseFloat(document.getElementById('cost').value),
                logged_at: document.getElementById('loggedAt').value,
                status: document.getElementById('status').value
            };

            try {
                if (id) {
                    await authenticatedFetch(`/maintenance/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    await authenticatedFetch('/maintenance', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }
                maintenanceModal.classList.remove('show');
                loadMaintenanceLogs();
            } catch (error) {
                alert(error.message || 'Error occurred while saving maintenance log.');
            }
        });
    }

    // Delete handler
    const deleteLog = async (id) => {
        if (confirm('Are you sure you want to permanently delete this maintenance log?')) {
            try {
                await authenticatedFetch(`/maintenance/${id}`, {
                    method: 'DELETE'
                });
                loadMaintenanceLogs();
            } catch (error) {
                alert(error.message || 'Failed to delete log.');
            }
        }
    };

    // Initialize list
    loadMaintenanceLogs();
});
