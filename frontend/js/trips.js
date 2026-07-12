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
    const liveBoardContainer = document.getElementById('liveBoardContainer');
    const searchInput = document.getElementById('searchInput');
    const tripForm = document.getElementById('tripForm');
    
    // Form Inputs
    const tripIdInput = document.getElementById('tripId');
    const sourceInput = document.getElementById('source');
    const destinationInput = document.getElementById('destination');
    const vehicleSelect = document.getElementById('vehicleSelect');
    const driverSelect = document.getElementById('driverSelect');
    const cargoWeightInput = document.getElementById('cargoWeight');
    const plannedDistanceInput = document.getElementById('plannedDistance');
    
    const dispatchBtn = document.getElementById('dispatchBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Validation UI
    const capacityWarningBox = document.getElementById('capacityWarningBox');
    const warningVehicleCap = document.getElementById('warningVehicleCap');
    const warningCargoWeight = document.getElementById('warningCargoWeight');
    const warningOverage = document.getElementById('warningOverage');

    // Lifecycle UI
    const nodeDraft = document.getElementById('node-Draft');
    const nodeDispatched = document.getElementById('node-Dispatched');
    const nodeCompleted = document.getElementById('node-Completed');
    const nodeCancelled = document.getElementById('node-Cancelled');

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

    // Cache vehicles & drivers
    let vehiclesCache = [];
    let driversCache = [];
    let allTrips = [];

    // Helper: populate select dropdowns
    const populateDropdowns = () => {
        if (!vehicleSelect || !driverSelect) return;
        
        const currentV = vehicleSelect.value;
        const currentD = driverSelect.value;

        vehicleSelect.innerHTML = '<option value="">Choose a vehicle...</option>';
        vehiclesCache.forEach(v => {
            if (v.status === 'Available' || v.status === 'On Trip' || v.id == currentV) {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = `${v.registration_number} - ${v.max_capacity} kg capacity`;
                vehicleSelect.appendChild(opt);
            }
        });
        vehicleSelect.value = currentV;

        driverSelect.innerHTML = '<option value="">Choose a driver...</option>';
        driversCache.forEach(d => {
            if (d.status === 'Available' || d.status === 'On Trip' || d.id == currentD) {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `${d.name}`;
                driverSelect.appendChild(opt);
            }
        });
        driverSelect.value = currentD;
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
            liveBoardContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading live board...</div>';
            
            if (vehiclesCache.length === 0 || driversCache.length === 0) {
                await loadMetaData();
            }

            allTrips = await authenticatedFetch('/trips');
            renderTrips(allTrips);
        } catch (error) {
            console.error('[Load Trips Error]', error);
            liveBoardContainer.innerHTML = '<div style="text-align: center; color: #fca5a5; padding: 2rem;">Failed to load trips.</div>';
        }
    };

    const renderTrips = (tripsList) => {
        liveBoardContainer.innerHTML = '';
        if (tripsList.length === 0) {
            liveBoardContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No trips active.</div>';
            return;
        }

        // Show newest first
        const sortedTrips = [...tripsList].reverse();

        sortedTrips.forEach(t => {
            let badgeColor = '#4b5563'; 
            let textColor = '#fff';
            let extraText = '';

            if (t.status === 'Dispatched') { badgeColor = '#60a5fa'; textColor = '#000'; extraText = '45 min'; }
            else if (t.status === 'Draft') { badgeColor = '#6b7280'; textColor = '#fff'; extraText = 'Awaiting driver'; }
            else if (t.status === 'Cancelled') { badgeColor = '#fca5a5'; textColor = '#000'; extraText = 'Vehicle went to shop'; }
            else if (t.status === 'Completed') { badgeColor = 'var(--secondary-color)'; textColor = '#000'; }

            const vehicle = vehiclesCache.find(v => v.id === t.vehicle_id);
            const driver = driversCache.find(d => d.id === t.driver_id);

            const vehicleText = vehicle ? vehicle.model : 'Unallocated';
            const driverText = driver ? driver.name : 'Unassigned';

            const card = document.createElement('div');
            card.style.border = '1px dashed rgba(255,255,255,0.2)';
            card.style.padding = '1rem';
            card.style.borderRadius = '8px';
            card.style.cursor = 'pointer';
            card.style.transition = 'background 0.2s';
            card.className = 'live-board-card';
            
            card.onmouseenter = () => card.style.backgroundColor = 'rgba(255,255,255,0.05)';
            card.onmouseleave = () => card.style.backgroundColor = 'transparent';
            
            card.onclick = () => loadTripIntoForm(t);

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 500; font-style: italic;">TR${String(t.id).padStart(3, '0')}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">${vehicleText} / ${driverText}</span>
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 1rem;">${t.source} &rarr; ${t.destination}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="background-color: ${badgeColor}; padding: 0.25rem 1rem; border-radius: 4px; color: ${textColor}; font-size: 0.8rem;">${t.status}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${extraText}</span>
                </div>
            `;
            liveBoardContainer.appendChild(card);
        });
    };

    // Form Dynamic Validation
    const validateDispatch = () => {
        const vId = vehicleSelect.value;
        const weight = parseFloat(cargoWeightInput.value);

        if (!vId || isNaN(weight)) {
            capacityWarningBox.style.display = 'none';
            dispatchBtn.style.pointerEvents = 'none';
            dispatchBtn.style.backgroundColor = 'rgba(255,255,255,0.05)';
            dispatchBtn.textContent = 'Dispatch (disabled)';
            dispatchBtn.style.color = 'var(--text-muted)';
            return;
        }

        const vehicle = vehiclesCache.find(v => v.id == vId);
        if (vehicle) {
            if (weight > vehicle.max_capacity) {
                // Invalid
                capacityWarningBox.style.display = 'block';
                warningVehicleCap.textContent = `Vehicle Capacity: ${vehicle.max_capacity} kg`;
                warningCargoWeight.textContent = `Cargo Weight: ${weight} kg`;
                warningOverage.textContent = `Capacity exceeded by ${weight - vehicle.max_capacity} kg - dispatch blocked`;
                
                dispatchBtn.style.pointerEvents = 'none';
                dispatchBtn.style.backgroundColor = 'rgba(255,255,255,0.05)';
                dispatchBtn.textContent = 'Dispatch (disabled)';
                dispatchBtn.style.color = 'var(--text-muted)';
            } else {
                // Valid
                capacityWarningBox.style.display = 'none';
                dispatchBtn.style.pointerEvents = 'auto';
                dispatchBtn.style.backgroundColor = 'var(--primary-color)';
                dispatchBtn.textContent = tripIdInput.value ? 'Update Trip' : 'Dispatch Trip';
                dispatchBtn.style.color = '#fff';
            }
        }
    };

    vehicleSelect.addEventListener('change', validateDispatch);
    cargoWeightInput.addEventListener('input', validateDispatch);

    // Lifecycle Animation
    const updateLifecycleUI = (status) => {
        [nodeDraft, nodeDispatched, nodeCompleted, nodeCancelled].forEach(node => {
            node.classList.remove('active');
            node.querySelector('.node-circle').style.backgroundColor = '#4b5563';
            node.querySelector('span').style.color = 'var(--text-muted)';
        });

        let activeNode = nodeDraft;
        let color = 'var(--secondary-color)';
        if (status === 'Dispatched') { activeNode = nodeDispatched; color = '#60a5fa'; }
        if (status === 'Completed') { activeNode = nodeCompleted; color = 'var(--secondary-color)'; }
        if (status === 'Cancelled') { activeNode = nodeCancelled; color = '#fca5a5'; }

        activeNode.classList.add('active');
        activeNode.querySelector('.node-circle').style.backgroundColor = color;
        activeNode.querySelector('span').style.color = color;
    };

    // Load existing trip into form
    const loadTripIntoForm = (trip) => {
        tripIdInput.value = trip.id;
        sourceInput.value = trip.source;
        destinationInput.value = trip.destination;
        
        // Ensure options exist
        populateDropdowns();
        
        vehicleSelect.value = trip.vehicle_id;
        driverSelect.value = trip.driver_id;
        cargoWeightInput.value = trip.cargo_weight;
        plannedDistanceInput.value = trip.planned_distance;
        
        updateLifecycleUI(trip.status);
        validateDispatch();
    };

    // Form submit handler
    tripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = tripIdInput.value;
        const dist = parseFloat(plannedDistanceInput.value) || 0;
        
        // Determine status: if it's a new trip, make it Dispatched if not specified otherwise.
        // Actually, if they click Dispatch Trip, it goes to Dispatched.
        let targetStatus = id ? allTrips.find(t=>t.id==id)?.status || 'Dispatched' : 'Dispatched';
        if (targetStatus === 'Draft') targetStatus = 'Dispatched';

        const payload = {
            source: sourceInput.value,
            destination: destinationInput.value,
            vehicle_id: parseInt(vehicleSelect.value, 10),
            driver_id: parseInt(driverSelect.value, 10),
            cargo_weight: parseFloat(cargoWeightInput.value),
            planned_distance: dist,
            revenue: dist * 2, // Auto-calculated revenue requirement for backend
            status: targetStatus
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
            tripForm.reset();
            tripIdInput.value = '';
            updateLifecycleUI('Draft');
            validateDispatch();
            loadTrips();
        } catch (error) {
            alert(error.message || 'Error occurred while saving trip.');
        }
    });

    cancelBtn.addEventListener('click', () => {
        tripForm.reset();
        tripIdInput.value = '';
        updateLifecycleUI('Draft');
        validateDispatch();
    });

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = allTrips.filter(t => {
                return t.source.toLowerCase().includes(query) || t.destination.toLowerCase().includes(query) || `TR${t.id}`.toLowerCase().includes(query);
            });
            renderTrips(filtered);
        });
    }

    // Initializer call
    updateLifecycleUI('Draft');
    loadTrips();
});
