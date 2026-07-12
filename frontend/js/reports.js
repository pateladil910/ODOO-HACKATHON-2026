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
    const tableBody = document.getElementById('reportsTableBody');
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

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

    // Load and render reports
    let allReports = [];
    const loadReports = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading analytical reports...</td></tr>';
            allReports = await authenticatedFetch('/analytics/reports');
            renderReports(allReports);
        } catch (error) {
            console.error('[Load Reports Error]', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">Failed to load fleet reports.</td></tr>';
        }
    };

    const renderReports = (reportsList) => {
        tableBody.innerHTML = '';
        if (reportsList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No report data found.</td></tr>';
            return;
        }

        reportsList.forEach(r => {
            const totalOperationalCost = (parseFloat(r.fuel_cost) + parseFloat(r.maintenance_cost) + parseFloat(r.other_expenses));
            const roiPct = (parseFloat(r.roi) * 100).toFixed(2);
            let roiColor = 'var(--text-dark)';
            if (parseFloat(r.roi) > 0) roiColor = 'var(--secondary-color)';
            if (parseFloat(r.roi) < 0) roiColor = 'var(--danger-color)';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${r.registration_number}</strong>
                    <br><small style="color:var(--text-muted)">${r.model} (${r.type})</small>
                </td>
                <td>${parseFloat(r.distance_traveled).toLocaleString()} km</td>
                <td>$${parseFloat(r.fuel_cost).toLocaleString()}</td>
                <td>$${parseFloat(r.maintenance_cost).toLocaleString()}</td>
                <td><strong>$${totalOperationalCost.toLocaleString()}</strong></td>
                <td>$${parseFloat(r.revenue).toLocaleString()}</td>
                <td><strong style="color: ${roiColor};">${roiPct}%</strong></td>
            `;
            tableBody.appendChild(tr);
        });
    };

    // Filter and Search Event Handlers
    const filterAndSearch = () => {
        const query = searchInput.value.toLowerCase();
        const selectedType = typeFilter.value;

        const filtered = allReports.filter(r => {
            const matchesSearch = r.registration_number.toLowerCase().includes(query) || r.model.toLowerCase().includes(query);
            const matchesType = !selectedType || r.type === selectedType;
            return matchesSearch && matchesType;
        });

        renderReports(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndSearch);
    if (typeFilter) typeFilter.addEventListener('change', filterAndSearch);

    // Export CSV handler
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', async () => {
            try {
                exportCsvBtn.disabled = true;
                exportCsvBtn.innerHTML = '<i class="ph ph-spinner animate" style="margin-right: 8px;"></i> Exporting...';
                
                const response = await fetch(`${API_BASE_URL}/analytics/export-csv`, {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('CSV Export failed');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transitops_fleet_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('[CSV Export Error]', error);
                alert('Failed to export fleet report to CSV.');
            } finally {
                exportCsvBtn.disabled = false;
                exportCsvBtn.innerHTML = '<i class="ph ph-download" style="margin-right: 8px;"></i> Export CSV';
            }
        });
    }

    // Initialize list
    loadReports();
});
