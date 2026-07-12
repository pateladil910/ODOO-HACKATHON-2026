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
    const fuelTableBody = document.getElementById('fuelTableBody');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const totalCostDisplay = document.getElementById('totalCostDisplay');
    
    const openFuelModalBtn = document.getElementById('openFuelModalBtn');
    const openExpenseModalBtn = document.getElementById('openExpenseModalBtn');
    
    const fuelModal = document.getElementById('fuelModal');
    const expenseModal = document.getElementById('expenseModal');
    
    const closeFuelModalBtn = document.getElementById('closeFuelModalBtn');
    const closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
    
    const fuelForm = document.getElementById('fuelForm');
    const expenseForm = document.getElementById('expenseForm');
    
    const fuelVehicleSelect = document.getElementById('fuelVehicleSelect');
    
    // We will inject the simple form back for expense to match backend
    const expenseFormHTML = `
        <div class="form-group">
            <label class="form-label" for="expenseVehicleSelect">Vehicle</label>
            <select id="expenseVehicleSelect" class="form-control" required>
                <option value="">Choose a vehicle...</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label" for="expenseType">Expense Type</label>
            <select id="expenseType" class="form-control" required>
                <option value="Tolls">Tolls</option>
                <option value="Permits">Permits</option>
                <option value="Insurance">Insurance</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label" for="expenseCost">Total Cost ($)</label>
            <input type="number" step="0.01" id="expenseCost" class="form-control" placeholder="e.g. 150" required>
        </div>
        <div class="form-group">
            <label class="form-label" for="expenseLoggedAt">Logged Date</label>
            <input type="date" id="expenseLoggedAt" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="padding: 0.875rem;">Log Expense</button>
    `;
    expenseForm.innerHTML = expenseFormHTML;
    const expenseVehicleSelect = document.getElementById('expenseVehicleSelect');

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

    // RBAC logic
    const canLogFuel = user.role === 'manager' || user.role === 'finance' || user.role === 'driver' || user.role === 'admin';
    const canLogExpense = user.role === 'manager' || user.role === 'finance' || user.role === 'admin';

    if (!canLogFuel && openFuelModalBtn) openFuelModalBtn.style.display = 'none';
    if (!canLogExpense && openExpenseModalBtn) openExpenseModalBtn.style.display = 'none';

    let vehiclesCache = [];
    
    const loadMetaData = async () => {
        try {
            vehiclesCache = await authenticatedFetch('/vehicles');
            [fuelVehicleSelect, expenseVehicleSelect].forEach(select => {
                if (select) {
                    const currentV = select.value;
                    select.innerHTML = '<option value="">Choose a vehicle...</option>';
                    vehiclesCache.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.id;
                        opt.textContent = `${v.registration_number} - ${v.model}`;
                        select.appendChild(opt);
                    });
                    select.value = currentV;
                }
            });
        } catch (error) {
            console.error('[Metadata Load Failure]', error);
        }
    };

    let totalFuelCost = 0;
    let totalOtherCost = 0;

    const updateTotal = () => {
        const grandTotal = totalFuelCost + totalOtherCost;
        if(totalCostDisplay) {
            totalCostDisplay.textContent = grandTotal.toLocaleString();
        }
    };

    const loadAllData = async () => {
        try {
            fuelTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">Loading fuel data...</td></tr>';
            expensesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1rem;">Loading expenses data...</td></tr>';
            
            if (vehiclesCache.length === 0) {
                await loadMetaData();
            }

            const [fuelLogs, expenses] = await Promise.all([
                authenticatedFetch('/expenses/fuel'),
                authenticatedFetch('/expenses/other')
            ]);
            
            renderFuelLogs(fuelLogs);
            renderExpenses(expenses);
        } catch (error) {
            console.error('[Load Error]', error);
        }
    };

    const renderFuelLogs = (logs) => {
        fuelTableBody.innerHTML = '';
        totalFuelCost = 0;
        if (logs.length === 0) {
            fuelTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">No refuel records logged yet.</td></tr>';
        } else {
            logs.forEach(log => {
                totalFuelCost += parseFloat(log.cost);
                const vehicle = vehiclesCache.find(v => v.id === log.vehicle_id);
                const regNum = vehicle ? vehicle.registration_number : `ID: ${log.vehicle_id}`;
                const formattedDate = log.logged_at ? new Date(log.logged_at).toISOString().split('T')[0] : '-';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${regNum}</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); color: var(--text-muted);">${formattedDate}</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${log.liters} L</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); text-align: right;">${parseFloat(log.cost).toLocaleString()}</td>
                `;
                fuelTableBody.appendChild(tr);
            });
        }
        updateTotal();
    };

    const renderExpenses = (expenses) => {
        expensesTableBody.innerHTML = '';
        totalOtherCost = 0;
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1rem;">No expense records logged yet.</td></tr>';
        } else {
            expenses.forEach(exp => {
                totalOtherCost += parseFloat(exp.cost);
                const vehicle = vehiclesCache.find(v => v.id === exp.vehicle_id);
                const regNum = vehicle ? vehicle.registration_number : `ID: ${exp.vehicle_id}`;

                // To match mockup layout for Other Expenses: Trip, Vehicle, Toll, Other, Maint, Total
                let toll = exp.type === 'Tolls' ? exp.cost : 0;
                let other = exp.type !== 'Tolls' ? exp.cost : 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">TR${String(exp.id).padStart(3, '0')}</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${regNum}</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${parseFloat(toll).toLocaleString()}</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">${parseFloat(other).toLocaleString()}</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); color: var(--text-muted);">0</td>
                    <td style="padding: 1rem 0; border-bottom: 1px dashed rgba(255,255,255,0.1); text-align: right;">
                        <span style="background-color: var(--secondary-color); color: #000; padding: 0.25rem 1rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">Completed</span>
                    </td>
                `;
                expensesTableBody.appendChild(tr);
            });
        }
        updateTotal();
    };

    // Modal Control: Fuel
    if (openFuelModalBtn) {
        openFuelModalBtn.addEventListener('click', () => {
            fuelForm.reset();
            document.getElementById('fuelLoggedAt').value = new Date().toISOString().split('T')[0];
            loadMetaData();
            fuelModal.classList.add('show');
        });
    }
    if (closeFuelModalBtn) {
        closeFuelModalBtn.addEventListener('click', () => {
            fuelModal.classList.remove('show');
        });
    }

    // Modal Control: Expense
    if (openExpenseModalBtn) {
        openExpenseModalBtn.addEventListener('click', () => {
            expenseForm.reset();
            document.getElementById('expenseLoggedAt').value = new Date().toISOString().split('T')[0];
            loadMetaData();
            expenseModal.classList.add('show');
        });
    }
    if (closeExpenseModalBtn) {
        closeExpenseModalBtn.addEventListener('click', () => {
            expenseModal.classList.remove('show');
        });
    }

    // Fuel Form Submit
    if (fuelForm) {
        fuelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                vehicle_id: parseInt(document.getElementById('fuelVehicleSelect').value, 10),
                liters: parseFloat(document.getElementById('liters').value),
                cost: parseFloat(document.getElementById('fuelCost').value),
                logged_at: document.getElementById('fuelLoggedAt').value
            };

            try {
                await authenticatedFetch('/expenses/fuel', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                fuelModal.classList.remove('show');
                loadAllData();
            } catch (error) {
                alert(error.message || 'Failed to log fuel refill.');
            }
        });
    }

    // Expense Form Submit
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                vehicle_id: parseInt(document.getElementById('expenseVehicleSelect').value, 10),
                type: document.getElementById('expenseType').value,
                cost: parseFloat(document.getElementById('expenseCost').value),
                logged_at: document.getElementById('expenseLoggedAt').value
            };

            try {
                await authenticatedFetch('/expenses/other', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                expenseModal.classList.remove('show');
                loadAllData();
            } catch (error) {
                alert(error.message || 'Failed to log operational expense.');
            }
        });
    }

    // Initialize
    loadAllData();
});
