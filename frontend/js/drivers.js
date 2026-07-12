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
    const tableBody = document.getElementById('driversTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const driverModal = document.getElementById('driverModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const driverForm = document.getElementById('driverForm');
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
    const hasWritePermission = user.role === 'manager' || user.role === 'safety' || user.role === 'admin';
    if (!hasWritePermission && openAddModalBtn) {
        openAddModalBtn.style.display = 'none';
    }

    // Load and render drivers
    let allDrivers = [];
    const loadDrivers = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading drivers registry...</td></tr>';
            allDrivers = await authenticatedFetch('/drivers');
            renderDrivers(allDrivers);
        } catch (error) {
            console.error('[Load Drivers Error]', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">Failed to load drivers.</td></tr>';
        }
    };

    const renderDrivers = (driversList) => {
        tableBody.innerHTML = '';
        if (driversList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No drivers found matching criteria.</td></tr>';
            return;
        }

        driversList.forEach(d => {
            let badgeClass = 'badge-info';
            if (d.status === 'Available') badgeClass = 'badge-success';
            if (d.status === 'Suspended') badgeClass = 'badge-danger';
            if (d.status === 'Off Duty') badgeClass = 'badge-warning';

            // Helper to format ISO date to YYYY-MM-DD
            const formattedExpiry = d.license_expiry_date ? new Date(d.license_expiry_date).toISOString().split('T')[0] : '-';
            const expiryDate = d.license_expiry_date ? new Date(d.license_expiry_date) : null;
            const today = new Date();
            let expiryWarning = '';
            
            if (expiryDate) {
                const diffTime = expiryDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    expiryWarning = ` <span class="badge badge-danger" style="font-size: 0.65rem; margin-left: 4px; display: inline-flex; align-items: center; gap: 2px;" title="License is EXPIRED!"><i class="ph ph-warning-octagon"></i> Expired</span>`;
                } else if (diffDays <= 30) {
                    expiryWarning = ` <span class="badge badge-warning" style="font-size: 0.65rem; margin-left: 4px; display: inline-flex; align-items: center; gap: 2px;" title="License expires in ${diffDays} days!"><i class="ph ph-warning"></i> Expiring Soon</span>`;
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${d.name}</strong></td>
                <td>
                    <div>${d.license_number}</div>
                    <small style="color: var(--text-muted); font-size: 0.75rem;">${d.license_category}</small>
                </td>
                <td>${formattedExpiry}${expiryWarning}</td>
                <td>${d.contact_number}</td>
                <td>
                    <span style="font-weight: 700; color: ${parseFloat(d.safety_score) >= 90 ? 'var(--secondary-color)' : 'var(--danger-color)'}">
                        ${d.safety_score}%
                    </span>
                </td>
                <td><span class="badge ${badgeClass}">${d.status}</span></td>
                <td>
                    ${hasWritePermission ? `
                        <button class="btn btn-sm edit-btn" data-id="${d.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); margin-right: 0.5rem;">Edit</button>
                        ${user.role === 'manager' || user.role === 'admin' ? `
                            <button class="btn btn-sm delete-btn" data-id="${d.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; box-shadow: var(--shadow-3d-btn); color: var(--danger-color);">Delete</button>
                        ` : ''}
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
                btn.addEventListener('click', () => deleteDriver(btn.getAttribute('data-id')));
            });
        }
    };

    // Filter and Search Event Handlers
    const filterAndSearch = () => {
        const query = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = allDrivers.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(query) || d.license_number.toLowerCase().includes(query);
            const matchesStatus = !selectedStatus || d.status === selectedStatus;
            return matchesSearch && matchesStatus;
        });

        renderDrivers(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSearch);
    if (statusFilter) statusFilter.addEventListener('change', filterAndSearch);

    // Modal Control Logic
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            modalTitle.textContent = 'Register New Driver';
            driverForm.reset();
            document.getElementById('driverId').value = '';
            document.getElementById('licenseNumber').disabled = false;
            driverModal.classList.add('show');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            driverModal.classList.remove('show');
        });
    }

    const openEditModal = async (id) => {
        try {
            const driver = await authenticatedFetch(`/drivers/${id}`);
            modalTitle.textContent = 'Edit Driver Details';
            
            document.getElementById('driverId').value = driver.id;
            document.getElementById('name').value = driver.name;
            document.getElementById('licenseNumber').value = driver.license_number;
            document.getElementById('licenseNumber').disabled = true; // Cannot edit license identifier
            document.getElementById('licenseCategory').value = driver.license_category;
            
            // Format expiry date to YYYY-MM-DD for date inputs
            const expiryDate = driver.license_expiry_date ? new Date(driver.license_expiry_date).toISOString().split('T')[0] : '';
            document.getElementById('expiryDate').value = expiryDate;
            
            document.getElementById('contactNumber').value = driver.contact_number;
            document.getElementById('safetyScore').value = driver.safety_score;
            document.getElementById('status').value = driver.status;

            driverModal.classList.add('show');
        } catch (error) {
            alert('Failed to retrieve driver details.');
        }
    };

    // Submit form handler (Add / Edit)
    if (driverForm) {
        driverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('driverId').value;
            const payload = {
                name: document.getElementById('name').value,
                license_number: document.getElementById('licenseNumber').value,
                license_category: document.getElementById('licenseCategory').value,
                license_expiry_date: document.getElementById('expiryDate').value,
                contact_number: document.getElementById('contactNumber').value,
                safety_score: parseFloat(document.getElementById('safetyScore').value),
                status: document.getElementById('status').value
            };

            try {
                if (id) {
                    // Update existing
                    await authenticatedFetch(`/drivers/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    // Register new
                    await authenticatedFetch('/drivers', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }
                driverModal.classList.remove('show');
                loadDrivers(); // Refresh table list
            } catch (error) {
                alert(error.message || 'Error occurred while saving driver details.');
            }
        });
    }

    // Delete driver handler
    const deleteDriver = async (id) => {
        if (confirm('Are you sure you want to delete this driver registration?')) {
            try {
                await authenticatedFetch(`/drivers/${id}`, {
                    method: 'DELETE'
                });
                loadDrivers(); // Refresh list
            } catch (error) {
                alert(error.message || 'Failed to delete driver.');
            }
        }
    };

    // Initialize list
    loadDrivers();
});
