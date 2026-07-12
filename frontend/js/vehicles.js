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
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading fleet registry...</td></tr>';
            allVehicles = await authenticatedFetch('/vehicles');
            renderVehicles(allVehicles);
        } catch (error) {
            console.error('[Load Vehicles Error]', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color); padding: 2rem;">Failed to load vehicles.</td></tr>';
        }
    };

    const renderVehicles = (vehiclesList) => {
        tableBody.innerHTML = '';
        if (vehiclesList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No vehicles found matching criteria.</td></tr>';
            return;
        }

        vehiclesList.forEach(v => {
            let badgeColor = '#6b7280'; // Default
            let textColor = '#000';
            if (v.status === 'Available') { badgeColor = 'var(--secondary-color)'; textColor = '#000'; }
            if (v.status === 'Retired') { badgeColor = '#fca5a5'; textColor = '#000'; }
            if (v.status === 'In Shop') { badgeColor = 'var(--warning-color)'; textColor = '#000'; }
            if (v.status === 'On Trip' || v.status === 'In Progress') { badgeColor = '#60a5fa'; textColor = '#000'; }

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 1rem;">${v.registration_number}</td>
                <td style="padding: 1rem;">${v.model}</td>
                <td style="padding: 1rem;">${v.type}</td>
                <td style="padding: 1rem;">${v.max_capacity} kg</td>
                <td style="padding: 1rem;">${parseFloat(v.odometer).toLocaleString()}</td>
                <td style="padding: 1rem;">${parseFloat(v.acquisition_cost || 0).toLocaleString()}</td>
                <td style="padding: 1rem;"><span style="background-color: ${badgeColor}; padding: 0.25rem 1rem; border-radius: 4px; color: ${textColor};">${v.status}</span></td>
                <td style="padding: 1rem;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline btn-sm docs-btn" data-id="${v.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="ph ph-paperclip"></i> Docs</button>
                        <button class="btn btn-outline btn-sm edit-btn" data-id="${v.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Edit</button>
                        <button class="btn btn-outline btn-sm delete-btn" data-id="${v.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #fca5a5;">Delete</button>
                    </div>
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
            document.querySelectorAll('.docs-btn').forEach(btn => {
                btn.addEventListener('click', () => openDocModal(btn.getAttribute('data-id')));
            });
        }
    };

    // --- Document Management Modal Handlers ---
    let currentVehicleIdForDocs = null;

    const openDocModal = async (vehicleId) => {
        currentVehicleIdForDocs = vehicleId;
        document.getElementById('docVehicleId').value = vehicleId;
        document.getElementById('docUploadForm').reset();
        const docModal = document.getElementById('documentModal');
        docModal.classList.add('show');
        loadVehicleDocuments(vehicleId);
    };

    const loadVehicleDocuments = async (vehicleId) => {
        const listContainer = document.getElementById('docListContainer');
        listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">Loading documents...</div>';
        try {
            const docs = await authenticatedFetch(`/vehicles/${vehicleId}/documents`);
            listContainer.innerHTML = '';
            if (docs.length === 0) {
                listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">No documents uploaded.</div>';
                return;
            }
            docs.forEach(doc => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.justify = 'space-between';
                div.style.alignItems = 'center';
                div.style.padding = '0.5rem';
                div.style.background = 'rgba(255,255,255,0.05)';
                div.style.borderRadius = '4px';
                div.style.border = '1px solid rgba(255,255,255,0.1)';
                
                div.innerHTML = `
                    <div style="display: flex; flex-direction: column; text-align: left;">
                        <span style="font-size: 0.85rem; font-weight: 500;">${doc.document_name}</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">${doc.file_name} (${(doc.file_size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <a href="${API_BASE_URL}/vehicles/documents/${doc.id}" target="_blank" class="btn btn-outline btn-sm" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; color: var(--secondary-color); text-decoration: none; display: flex; align-items: center;"><i class="ph ph-download"></i></a>
                        <button class="btn btn-outline btn-sm delete-doc-btn" data-id="${doc.id}" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; color: #fca5a5;"><i class="ph ph-trash"></i></button>
                    </div>
                `;
                listContainer.appendChild(div);
            });
            // Attach delete listeners
            listContainer.querySelectorAll('.delete-doc-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteDocument(btn.getAttribute('data-id')));
            });
        } catch (err) {
            listContainer.innerHTML = '<div style="color: #fca5a5; font-size: 0.85rem; text-align: center; padding: 1rem;">Failed to load documents.</div>';
        }
    };

    const uploadDocument = async (e) => {
        e.preventDefault();
        const vehicleId = document.getElementById('docVehicleId').value;
        const docName = document.getElementById('docName').value;
        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async () => {
            const base64Data = reader.result;
            const payload = {
                document_name: docName,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                file_data: base64Data
            };
            try {
                await authenticatedFetch(`/vehicles/${vehicleId}/documents`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                loadVehicleDocuments(vehicleId);
                document.getElementById('docUploadForm').reset();
            } catch (err) {
                alert(err.message || 'Failed to upload document.');
            }
        };
        reader.readAsDataURL(file);
    };

    const deleteDocument = async (docId) => {
        if (confirm('Are you sure you want to delete this document?')) {
            try {
                await authenticatedFetch(`/vehicles/documents/${docId}`, {
                    method: 'DELETE'
                });
                loadVehicleDocuments(currentVehicleIdForDocs);
            } catch (err) {
                alert(err.message || 'Failed to delete document.');
            }
        }
    };

    const docUploadForm = document.getElementById('docUploadForm');
    if (docUploadForm) {
        docUploadForm.addEventListener('submit', uploadDocument);
    }

    const closeDocModalBtn = document.getElementById('closeDocModalBtn');
    if (closeDocModalBtn) {
        closeDocModalBtn.addEventListener('click', () => {
            document.getElementById('documentModal').classList.remove('show');
        });
    }

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
