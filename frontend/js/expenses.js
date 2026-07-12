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
    
    const openFuelModalBtn = document.getElementById('openFuelModalBtn');
    const openExpenseModalBtn = document.getElementById('openExpenseModalBtn');
    
    const fuelModal = document.getElementById('fuelModal');
    const expenseModal = document.getElementById('expenseModal');
    
    const closeFuelModalBtn = document.getElementById('closeFuelModalBtn');
    const closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
    
    const fuelForm = document.getElementById('fuelForm');
    const expenseForm = document.getElementById('expenseForm');
    
    const fuelVehicleSelect = document.getElementById('fuelVehicleSelect');
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

    // Cache vehicles for display mapping
    let vehiclesCache = [];
    
    const loadMetaData = async () => {
        try {
            vehiclesCache = await authenticatedFetch('/vehicles');
            
            // Populate both vehicle selections
            [fuelVehicleSelect, expenseVehicleSelect].forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">Choose a vehicle...</option>';
                    vehiclesCache.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.id;
                        opt.textContent = `${v.registration_number} - ${v.model}`;
                        select.appendChild(opt);
                    });
                }
            });
        } catch (error) {
            console.error('[Metadata Load Failure]', error);
        }
    };

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'fuelTab') {
                loadFuelLogs();
            } else {
                loadExpenses();
            }
        });
    });

    // Fetch and Load Fuel Logs
    const loadFuelLogs = async () => {
        try {
            fuelTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Loading refuel data...</td></tr>';
            
            if (vehiclesCache.length === 0) {
                await loadMetaData();
            }

            const fuelLogs = await authenticatedFetch('/expenses/fuel');
            renderFuelLogs(fuelLogs);
        } catch (error) {
            console.error('[Fuel Load Error]', error);
            fuelTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Failed to load fuel logs.</td></tr>';
        }
    };

    const renderFuelLogs = (logs) => {
        fuelTableBody.innerHTML = '';
        if (logs.length === 0) {
            fuelTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No refuel records logged yet.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const vehicle = vehiclesCache.find(v => v.id === log.vehicle_id);
            const regNum = vehicle ? vehicle.registration_number : `ID: ${log.vehicle_id}`;
            const formattedDate = log.logged_at ? new Date(log.logged_at).toISOString().split('T')[0] : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${log.id}</strong></td>
                <td><strong>${regNum}</strong></td>
                <td>${log.liters} Liters</td>
                <td>$${parseFloat(log.cost).toLocaleString()}</td>
                <td>${formattedDate}</td>
            `;
            fuelTableBody.appendChild(tr);
        });
    };

    // Fetch and Load Other Expenses
    const loadExpenses = async () => {
        try {
            expensesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Loading expenses data...</td></tr>';
            
            if (vehiclesCache.length === 0) {
                await loadMetaData();
            }

            const expenses = await authenticatedFetch('/expenses/other');
            renderExpenses(expenses);
        } catch (error) {
            console.error('[Expenses Load Error]', error);
            expensesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger-color);">Failed to load expenses logs.</td></tr>';
        }
    };

    const renderExpenses = (expenses) => {
        expensesTableBody.innerHTML = '';
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No expense records logged yet.</td></tr>';
            return;
        }

        expenses.forEach(exp => {
            const vehicle = vehiclesCache.find(v => v.id === exp.vehicle_id);
            const regNum = vehicle ? vehicle.registration_number : `ID: ${exp.vehicle_id}`;
            const formattedDate = exp.logged_at ? new Date(exp.logged_at).toISOString().split('T')[0] : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${exp.id}</strong></td>
                <td><strong>${regNum}</strong></td>
                <td><span class="badge badge-info">${exp.type}</span></td>
                <td>$${parseFloat(exp.cost).toLocaleString()}</td>
                <td>${formattedDate}</td>
            `;
            expensesTableBody.appendChild(tr);
        });
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
                loadFuelLogs();
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
                loadExpenses();
            } catch (error) {
                alert(error.message || 'Failed to log operational expense.');
            }
        });
    }

    // Initialize (Load Fuel tab first)
    loadFuelLogs();
});
