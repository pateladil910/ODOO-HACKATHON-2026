document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('transitOpsUser');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userData);

    const getApiBaseUrl = () => {
        const { origin } = window.location;
        if (origin.includes(':5005')) return '/api/v1';
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) return 'http://localhost:5005/api/v1';
        return '/api/v1';
    };

    const API_BASE_URL = getApiBaseUrl();

    // DOM Elements
    const kpiFuelEff = document.getElementById('kpiFuelEff');
    const kpiUtil = document.getElementById('kpiUtil');
    const kpiCost = document.getElementById('kpiCost');
    const kpiRoi = document.getElementById('kpiRoi');
    
    const revenueChart = document.getElementById('revenueChart');
    const costliestChart = document.getElementById('costliestChart');
    
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    let allReports = [];

    const authenticatedFetch = async (endpoint, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            ...options.headers
        };
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('transitOpsUser');
            window.location.href = 'login.html';
            return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'API request failed');
        return result.data !== undefined ? result.data : result;
    };

    const loadReports = async () => {
        try {
            allReports = await authenticatedFetch('/analytics/reports');
            renderDashboard(allReports);
        } catch (error) {
            console.error('[Load Reports Error]', error);
            revenueChart.innerHTML = '<div style="color:var(--danger-color)">Failed to load data</div>';
            costliestChart.innerHTML = '<div style="color:var(--danger-color)">Failed to load data</div>';
        }
    };

    const renderDashboard = (reportsList) => {
        if (!reportsList || reportsList.length === 0) return;

        let totalCost = 0;
        let sumRoi = 0;
        let totalRevenue = 0;

        // Calculate totals for KPIs
        reportsList.forEach(r => {
            const rCost = parseFloat(r.fuel_cost || 0) + parseFloat(r.maintenance_cost || 0) + parseFloat(r.other_expenses || 0);
            totalCost += rCost;
            sumRoi += parseFloat(r.roi || 0);
            totalRevenue += parseFloat(r.revenue || 0);
            
            // Store total cost on object for sorting
            r.totalOperationalCost = rCost;
        });

        const avgRoi = reportsList.length > 0 ? (sumRoi / reportsList.length) * 100 : 0;
        const netProfit = totalRevenue - totalCost;

        // Update KPIs
        if (kpiFuelEff) kpiFuelEff.innerHTML = '8.4 <span style="font-size:1rem; color:var(--text-muted); font-weight:400;">km/l</span>';
        if (kpiUtil) kpiUtil.textContent = '81%';
        if (kpiCost) kpiCost.textContent = '$' + Math.round(totalCost).toLocaleString();
        if (kpiRoi) kpiRoi.textContent = avgRoi.toFixed(1) + '%';
        
        const kpiProfit = document.getElementById('kpiProfit');
        if (kpiProfit) {
            kpiProfit.textContent = (netProfit >= 0 ? '$' : '-$') + Math.abs(Math.round(netProfit)).toLocaleString();
        }

        renderRevenueChart();
        renderCostliestVehicles(reportsList);
    };

    const renderRevenueChart = () => {
        const mockData = [
            { month: 'Jan', value: 42000 },
            { month: 'Feb', value: 38000 },
            { month: 'Mar', value: 55000 },
            { month: 'Apr', value: 61000 },
            { month: 'May', value: 72000 },
            { month: 'Jun', value: 85000 }
        ];
        
        const maxVal = Math.max(...mockData.map(d => d.value));

        let html = '';
        mockData.forEach(d => {
            const heightPct = (d.value / maxVal) * 100;
            html += `
                <div class="bar-column">
                    <div class="bar" style="height: ${heightPct}%;"></div>
                    <span class="bar-label">${d.month}</span>
                </div>
            `;
        });
        revenueChart.innerHTML = html;
    };

    const renderCostliestVehicles = (reportsList) => {
        const sorted = [...reportsList].sort((a, b) => b.totalOperationalCost - a.totalOperationalCost);
        const top3 = sorted.slice(0, 3);
        
        if (top3.length === 0) {
            costliestChart.innerHTML = '<div style="color:var(--text-muted)">No vehicle data</div>';
            return;
        }

        const maxCost = top3[0].totalOperationalCost || 1;
        const colors = ['fill-danger', 'fill-warning', 'fill-info'];

        let html = '';
        top3.forEach((v, index) => {
            const widthPct = (v.totalOperationalCost / maxCost) * 100;
            const colorClass = colors[index % colors.length];
            
            html += `
                <div class="progress-item">
                    <div class="progress-label-row">
                        <span class="progress-vehicle">${v.registration_number}</span>
                        <span class="progress-cost">$${Math.round(v.totalOperationalCost).toLocaleString()}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill ${colorClass}" style="width: ${widthPct}%;"></div>
                    </div>
                </div>
            `;
        });
        costliestChart.innerHTML = html;
    };

    // Export Handlers
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (allReports.length === 0) {
                alert('No data to export');
                return;
            }
            const headers = ['Vehicle', 'Model', 'Distance (km)', 'Fuel Cost', 'Maintenance', 'Other Exp', 'Total Cost', 'Revenue', 'ROI'];
            const rows = allReports.map(r => [
                r.registration_number,
                r.model,
                r.distance_traveled,
                r.fuel_cost,
                r.maintenance_cost,
                r.other_expenses,
                r.totalOperationalCost,
                r.revenue,
                r.roi
            ]);
            
            let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `fleet_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }


    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (typeof html2pdf === 'undefined') {
                alert('PDF library not loaded.');
                return;
            }
            const element = document.getElementById('reportContent');
            
            const opt = {
                margin:       0.5,
                filename:     `fleet_dashboard_${new Date().toISOString().split('T')[0]}.pdf`,
                image:        { type: 'jpeg', quality: 1.0 },
                html2canvas:  { scale: 3, useCORS: true, backgroundColor: '#0f1015', windowWidth: 1200 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save();
        });
    }

    // Initialize
    loadReports();
});
