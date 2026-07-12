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
    const maintenanceForm = document.getElementById('maintenanceForm');
    
    const logIdInput = document.getElementById('logId');
    const vehicleSelect = document.getElementById('vehicleSelect');
    const descriptionInput = document.getElementById('description');
    const costInput = document.getElementById('cost');
    const loggedAtInput = document.getElementById('loggedAt');
    const statusSelect = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');

    // Default date to today
    loggedAtInput.value = new Date().toISOString().split('T')[0];

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

    // Cache vehicles to map registration info
    let vehiclesCache = [];
    let allLogs = [];

    const loadMetaData = async () => {
        try {
            vehiclesCache = await authenticatedFetch('/vehicles');
            if (vehicleSelect) {
                const currentV = vehicleSelect.value;
                vehicleSelect.innerHTML = '<option value="">Choose a vehicle...</option>';
                vehiclesCache.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.id;
                    opt.textContent = `${v.registration_number} - ${v.model}`;
                    vehicleSelect.appendChild(opt);
                });
                vehicleSelect.value = currentV;
            }
        } catch (error) {
            console.error('[Metadata Load Failure]', error);
        }
    };

    // Load and render maintenance logs
    const loadMaintenanceLogs = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading service log...</td></tr>';
            
            if (vehiclesCache.length === 0) {
                await loadMetaData();
            }

            allLogs = await authenticatedFetch('/maintenance');
            renderLogs(allLogs);
        } catch (error) {
            console.error('[Load Maintenance Logs Error]', error);
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #fca5a5; padding: 2rem;">Failed to load logs.</td></tr>';
        }
    };

    const renderLogs = (logsList) => {
        tableBody.innerHTML = '';
        if (logsList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">No maintenance logs found.</td></tr>';
            return;
        }

        // Show newest first
        const sortedLogs = [...logsList].reverse();

        sortedLogs.forEach(log => {
            let badgeBg = '#f59e0b';
            let badgeColor = '#000';
            let statusText = 'In Shop';
            
            if (log.status === 'Closed') {
                badgeBg = 'var(--secondary-color)';
                statusText = 'Completed';
            }

            const vehicle = vehiclesCache.find(v => v.id === log.vehicle_id);
            const vehicleReg = vehicle ? vehicle.registration_number : `ID: ${log.vehicle_id}`;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px dashed rgba(255,255,255,0.1)';
            tr.style.cursor = 'pointer';
            
            tr.onmouseenter = () => tr.style.backgroundColor = 'rgba(255,255,255,0.02)';
            tr.onmouseleave = () => tr.style.backgroundColor = 'transparent';
            tr.onclick = () => loadLogIntoForm(log);

            tr.innerHTML = `
                <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${vehicleReg}</td>
                <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); color: var(--text-muted);">${log.description}</td>
                <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${parseFloat(log.cost).toLocaleString()}</td>
                <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); text-align: right;">
                    <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 0.25rem 1rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${statusText}</span>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    };

    const loadLogIntoForm = (log) => {
        logIdInput.value = log.id;
        vehicleSelect.value = log.vehicle_id;
        descriptionInput.value = log.description;
        costInput.value = log.cost;
        
        const loggedAtDate = log.logged_at ? new Date(log.logged_at).toISOString().split('T')[0] : '';
        loggedAtInput.value = loggedAtDate;
        statusSelect.value = log.status;
        
        saveBtn.textContent = 'Update Record';
    };

    // Form submit
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.textContent = 'Saving...';
        saveBtn.style.opacity = '0.7';

        const id = logIdInput.value;
        const payload = {
            vehicle_id: parseInt(vehicleSelect.value, 10),
            description: descriptionInput.value,
            cost: parseFloat(costInput.value),
            logged_at: loggedAtInput.value,
            status: statusSelect.value
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

            // Optional: If status is 'Active' (In Shop), we could technically hit the vehicle API to update its status to 'Maintenance'
            // but the backend might already handle this, or we just rely on the existing status field.
            
            maintenanceForm.reset();
            logIdInput.value = '';
            loggedAtInput.value = new Date().toISOString().split('T')[0];
            saveBtn.textContent = 'Save';
            saveBtn.style.opacity = '1';
            
            await loadMaintenanceLogs();
        } catch (error) {
            saveBtn.textContent = 'Save';
            saveBtn.style.opacity = '1';
            alert(error.message || 'Error occurred while saving maintenance log.');
        }
    });

    // Initialize list
    loadMaintenanceLogs();
});
