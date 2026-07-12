// TransitOps Dashboard Integration Logic
document.addEventListener('DOMContentLoaded', () => {
  // --- Check Authenticated Session ---
  const userJSON = localStorage.getItem('transitOpsUser');

  if (!userJSON) {
    window.location.href = 'login.html';
    return;
  }

  const currentUser = JSON.parse(userJSON);
  
  // --- DOM Elements ---
  const userEmailEl = document.getElementById('user-email');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarTextEl = document.getElementById('user-avatar-text');
  const welcomeUsernameEl = document.getElementById('welcome-username');
  const logoutBtn = document.getElementById('logoutBtn');
  
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const headerActionContainer = document.getElementById('header-action-container');
  
  // Tab panels & links
  const navLinks = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Vehicles selectors
  const vehiclesTableBody = document.getElementById('vehicles-table-body');
  const vehicleSearch = document.getElementById('vehicle-search');
  const filterVehicleType = document.getElementById('filter-vehicle-type');
  const filterVehicleStatus = document.getElementById('filter-vehicle-status');
  
  const vehicleModal = document.getElementById('vehicle-modal');
  const vehicleForm = document.getElementById('vehicle-form');
  const vehicleModalTitle = document.getElementById('vehicle-modal-title');
  const closeVehicleModal = document.getElementById('close-vehicle-modal');
  const btnCancelVehicle = document.getElementById('btn-cancel-vehicle');

  // Drivers selectors
  const driversTableBody = document.getElementById('drivers-table-body');
  const driverSearch = document.getElementById('driver-search');
  const filterDriverStatus = document.getElementById('filter-driver-status');
  
  const driverModal = document.getElementById('driver-modal');
  const driverForm = document.getElementById('driver-form');
  const driverModalTitle = document.getElementById('driver-modal-title');
  const closeDriverModal = document.getElementById('close-driver-modal');
  const btnCancelDriver = document.getElementById('btn-cancel-driver');

  // --- Session Setup ---
  if (userEmailEl) userEmailEl.textContent = currentUser.email;
  if (userRoleEl) userRoleEl.textContent = currentUser.role.replace('_', ' ');
  if (userAvatarTextEl) userAvatarTextEl.textContent = currentUser.email.charAt(0).toUpperCase();
  if (welcomeUsernameEl) welcomeUsernameEl.textContent = currentUser.email.split('@')[0];

  // Logout Trigger
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('transitOpsUser');
      window.api.showToast('Signed out successfully.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    });
  }

  // --- Tab Panel Router ---
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      
      // Update nav link active state
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update panel visibility
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `tab-${targetTab}`) {
          panel.classList.add('active');
        }
      });
      
      // Update headers & triggers
      updatePageHeader(targetTab);
    });
  });

  function updatePageHeader(tabName) {
    headerActionContainer.innerHTML = ''; // clear header buttons
    
    if (tabName === 'dashboard') {
      pageTitle.textContent = 'Operational Dashboard';
      pageSubtitle.textContent = 'Real-time fleet and logistics management controls.';
      loadKPIs();
    } 
    else if (tabName === 'vehicles') {
      pageTitle.textContent = 'Vehicles Registry';
      pageSubtitle.textContent = 'Manage vehicle details, max load capacities, and active maintenance.';
      
      // Verify authorization role: only managers and admins can add
      if (['fleet_manager', 'admin'].includes(currentUser.role)) {
        headerActionContainer.innerHTML = `
          <button class="btn btn-primary" id="btn-add-vehicle">
            <span>➕</span> Add Vehicle
          </button>
        `;
        document.getElementById('btn-add-vehicle').addEventListener('click', () => openVehicleFormModal());
      }
      loadVehicles();
    } 
    else if (tabName === 'drivers') {
      pageTitle.textContent = 'Driver Profiles';
      pageSubtitle.textContent = 'Track commercial licenses validity, contact numbers, and driver safety scores.';
      
      if (['safety_officer', 'fleet_manager', 'admin'].includes(currentUser.role)) {
        headerActionContainer.innerHTML = `
          <button class="btn btn-primary" id="btn-add-driver">
            <span>➕</span> Add Driver
          </button>
        `;
        document.getElementById('btn-add-driver').addEventListener('click', () => openDriverFormModal());
      }
      loadDrivers();
    }
    else if (tabName === 'trips') {
      pageTitle.textContent = 'Trip Management';
      pageSubtitle.textContent = 'Create, validate, dispatch, and track trips status across the fleet.';
      
      if (['driver', 'fleet_manager', 'admin'].includes(currentUser.role)) {
        headerActionContainer.innerHTML = `
          <button class="btn btn-primary" id="btn-add-trip">
            <span>➕</span> Create Trip
          </button>
        `;
        document.getElementById('btn-add-trip').addEventListener('click', () => openTripFormModal());
      }
      loadTrips();
    }
  }

  // --- KPI Metrics Loader ---
  async function loadKPIs() {
    try {
      // In a real database we fetch from an analytics endpoint, or compute here for mock bypass
      const vehicles = await window.api.get('/vehicles');
      const drivers = await window.api.get('/drivers');
      
      let totalVehicles = vehicles.length;
      let inMaintenance = vehicles.filter(v => v.status === 'In Shop').length;
      let driversOnDuty = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length;
      
      // Get trips count (handled in Hour 3)
      let activeTrips = 0;
      try {
        const trips = await window.api.get('/trips');
        activeTrips = trips.filter(t => t.status === 'Dispatched').length;
      } catch(e) {}
      
      document.getElementById('kpi-total-vehicles').textContent = totalVehicles;
      document.getElementById('kpi-in-maintenance').textContent = inMaintenance;
      document.getElementById('kpi-drivers-on-duty').textContent = driversOnDuty;
      document.getElementById('kpi-active-trips').textContent = activeTrips;
    } catch (err) {
      console.error('Error loading KPIs', err);
    }
  }

  // --- VEHICLES MODULE ---
  async function loadVehicles() {
    try {
      const search = vehicleSearch.value.trim();
      const type = filterVehicleType.value;
      const status = filterVehicleStatus.value;
      
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (type) queryParams.push(`type=${encodeURIComponent(type)}`);
      if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
      
      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      const vehicles = await window.api.get(`/vehicles${queryString}`);
      
      vehiclesTableBody.innerHTML = '';
      if (!vehicles.length) {
        vehiclesTableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
              No vehicles registered matching selected filters.
            </td>
          </tr>
        `;
        return;
      }
      
      vehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        
        // Show role actions block based on role permissions
        const showEdit = ['fleet_manager', 'admin'].includes(currentUser.role);
        const showDelete = currentUser.role === 'admin';
        
        row.innerHTML = `
          <td style="font-weight: 700; color: #a5b4fc;">${vehicle.registration_number}</td>
          <td>${vehicle.model}</td>
          <td>${vehicle.type}</td>
          <td>${parseFloat(vehicle.max_capacity).toLocaleString()} kg</td>
          <td>${parseFloat(vehicle.odometer).toLocaleString()} km</td>
          <td>$${parseFloat(vehicle.acquisition_cost).toLocaleString()}</td>
          <td>
            <span class="status-pill ${vehicle.status.toLowerCase().replace(' ', '-')}">
              ${vehicle.status}
            </span>
          </td>
          <td class="actions-cell">
            ${showEdit ? `<button class="action-btn btn-edit" title="Edit Vehicle" data-id="${vehicle.id}">✏️</button>` : ''}
            ${showDelete ? `<button class="action-btn btn-delete" title="Delete Vehicle" data-id="${vehicle.id}">🗑️</button>` : ''}
            ${!showEdit && !showDelete ? '<span style="color:var(--text-muted); font-size:0.8rem;">Read Only</span>' : ''}
          </td>
        `;
        vehiclesTableBody.appendChild(row);
      });
      
      // Bind action listeners
      vehiclesTableBody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editVehicle(btn.getAttribute('data-id')));
      });
      
      vehiclesTableBody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteVehicle(btn.getAttribute('data-id')));
      });
      
    } catch (err) {
      console.error('Error fetching vehicles', err);
    }
  }

  // Bind filters
  vehicleSearch.addEventListener('input', debounce(loadVehicles, 300));
  filterVehicleType.addEventListener('change', loadVehicles);
  filterVehicleStatus.addEventListener('change', loadVehicles);

  function openVehicleFormModal(vehicle = null) {
    vehicleForm.reset();
    document.getElementById('vehicle-id').value = '';
    
    if (vehicle) {
      vehicleModalTitle.textContent = 'Edit Vehicle';
      document.getElementById('vehicle-id').value = vehicle.id;
      document.getElementById('vehicle-reg').value = vehicle.registration_number;
      document.getElementById('vehicle-reg').disabled = true; // reg number is immutable
      document.getElementById('vehicle-model').value = vehicle.model;
      document.getElementById('vehicle-type').value = vehicle.type;
      document.getElementById('vehicle-capacity').value = vehicle.max_capacity;
      document.getElementById('vehicle-odometer').value = vehicle.odometer;
      document.getElementById('vehicle-cost').value = vehicle.acquisition_cost;
      document.getElementById('vehicle-status').value = vehicle.status;
      document.getElementById('btn-save-vehicle').textContent = 'Save Changes';
    } else {
      vehicleModalTitle.textContent = 'Register Vehicle';
      document.getElementById('vehicle-reg').disabled = false;
      document.getElementById('vehicle-status').value = 'Available';
      document.getElementById('btn-save-vehicle').textContent = 'Register Vehicle';
    }
    
    vehicleModal.classList.add('active');
  }

  function closeVehicleModalCard() {
    vehicleModal.classList.remove('active');
  }

  closeVehicleModal.addEventListener('click', closeVehicleModalCard);
  btnCancelVehicle.addEventListener('click', closeVehicleModalCard);
  
  vehicleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('vehicle-id').value;
    const vehicleData = {
      registration_number: document.getElementById('vehicle-reg').value,
      model: document.getElementById('vehicle-model').value,
      type: document.getElementById('vehicle-type').value,
      max_capacity: document.getElementById('vehicle-capacity').value,
      odometer: document.getElementById('vehicle-odometer').value,
      acquisition_cost: document.getElementById('vehicle-cost').value,
      status: document.getElementById('vehicle-status').value
    };
    
    try {
      if (id) {
        // Edit vehicle
        await window.api.put(`/vehicles/${id}`, vehicleData);
        window.api.showToast('Vehicle details updated successfully.', 'success');
      } else {
        // Create vehicle
        await window.api.post('/vehicles', vehicleData);
        window.api.showToast('New vehicle registered successfully.', 'success');
      }
      closeVehicleModalCard();
      loadVehicles();
    } catch (err) {
      console.error(err);
    }
  });

  async function editVehicle(id) {
    try {
      const vehicle = await window.api.get(`/vehicles/${id}`);
      openVehicleFormModal(vehicle);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle from the registry?')) return;
    try {
      await window.api.delete(`/vehicles/${id}`);
      window.api.showToast('Vehicle deleted successfully.', 'success');
      loadVehicles();
    } catch (err) {
      console.error(err);
    }
  }

  // --- DRIVERS MODULE ---
  async function loadDrivers() {
    try {
      const search = driverSearch.value.trim();
      const status = filterDriverStatus.value;
      
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
      
      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      const drivers = await window.api.get(`/drivers${queryString}`);
      
      driversTableBody.innerHTML = '';
      if (!drivers.length) {
        driversTableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
              No drivers registered matching selected filters.
            </td>
          </tr>
        `;
        return;
      }
      
      drivers.forEach(driver => {
        const row = document.createElement('tr');
        
        // Expiry check
        const expiryDate = new Date(driver.license_expiry_date);
        const isExpired = expiryDate < new Date();
        const expiryColor = isExpired ? 'color: #ef4444; font-weight: 700;' : '';
        
        const showEdit = ['safety_officer', 'fleet_manager', 'admin'].includes(currentUser.role);
        const showDelete = currentUser.role === 'admin';
        
        row.innerHTML = `
          <td style="font-weight: 600;">${driver.name}</td>
          <td>${driver.license_number}</td>
          <td>${driver.license_category}</td>
          <td style="${expiryColor}">
            ${driver.license_expiry_date.split('T')[0]} 
            ${isExpired ? '⚠️ (EXPIRED)' : ''}
          </td>
          <td>${driver.contact_number}</td>
          <td style="font-weight: 700; color: ${driver.safety_score >= 85 ? '#34d399' : '#fca5a5'}">
            ${parseFloat(driver.safety_score)}
          </td>
          <td>
            <span class="status-pill ${driver.status.toLowerCase().replace(' ', '-')}">
              ${driver.status}
            </span>
          </td>
          <td class="actions-cell">
            ${showEdit ? `<button class="action-btn btn-edit-driver" title="Edit Driver" data-id="${driver.id}">✏️</button>` : ''}
            ${showDelete ? `<button class="action-btn btn-delete-driver" title="Delete Driver" data-id="${driver.id}">🗑️</button>` : ''}
            ${!showEdit && !showDelete ? '<span style="color:var(--text-muted); font-size:0.8rem;">Read Only</span>' : ''}
          </td>
        `;
        driversTableBody.appendChild(row);
      });
      
      // Bind actions
      driversTableBody.querySelectorAll('.btn-edit-driver').forEach(btn => {
        btn.addEventListener('click', () => editDriver(btn.getAttribute('data-id')));
      });
      
      driversTableBody.querySelectorAll('.btn-delete-driver').forEach(btn => {
        btn.addEventListener('click', () => deleteDriver(btn.getAttribute('data-id')));
      });
      
    } catch (err) {
      console.error('Error fetching drivers', err);
    }
  }

  // Bind filters
  driverSearch.addEventListener('input', debounce(loadDrivers, 300));
  filterDriverStatus.addEventListener('change', loadDrivers);

  function openDriverFormModal(driver = null) {
    driverForm.reset();
    document.getElementById('driver-id').value = '';
    
    if (driver) {
      driverModalTitle.textContent = 'Edit Driver Profile';
      document.getElementById('driver-id').value = driver.id;
      document.getElementById('driver-name').value = driver.name;
      document.getElementById('driver-license').value = driver.license_number;
      document.getElementById('driver-license').disabled = true; // License number is immutable
      document.getElementById('driver-category').value = driver.license_category;
      document.getElementById('driver-expiry').value = driver.license_expiry_date.split('T')[0];
      document.getElementById('driver-phone').value = driver.contact_number;
      document.getElementById('driver-score').value = driver.safety_score;
      document.getElementById('driver-status').value = driver.status;
      document.getElementById('btn-save-driver').textContent = 'Save Changes';
    } else {
      driverModalTitle.textContent = 'Register Driver';
      document.getElementById('driver-license').disabled = false;
      document.getElementById('driver-score').value = 100;
      document.getElementById('driver-status').value = 'Available';
      document.getElementById('btn-save-driver').textContent = 'Register Driver';
    }
    
    driverModal.classList.add('active');
  }

  function closeDriverModalCard() {
    driverModal.classList.remove('active');
  }

  closeDriverModal.addEventListener('click', closeDriverModalCard);
  btnCancelDriver.addEventListener('click', closeDriverModalCard);
  
  driverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('driver-id').value;
    const driverData = {
      name: document.getElementById('driver-name').value,
      license_number: document.getElementById('driver-license').value,
      license_category: document.getElementById('driver-category').value,
      license_expiry_date: document.getElementById('driver-expiry').value,
      contact_number: document.getElementById('driver-phone').value,
      safety_score: document.getElementById('driver-score').value,
      status: document.getElementById('driver-status').value
    };
    
    try {
      if (id) {
        await window.api.put(`/drivers/${id}`, driverData);
        window.api.showToast('Driver profile updated successfully.', 'success');
      } else {
        await window.api.post('/drivers', driverData);
        window.api.showToast('New driver registered successfully.', 'success');
      }
      closeDriverModalCard();
      loadDrivers();
    } catch (err) {
      console.error(err);
    }
  });

  async function editDriver(id) {
    try {
      const driver = await window.api.get(`/drivers/${id}`);
      openDriverFormModal(driver);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteDriver(id) {
    if (!confirm('Are you sure you want to delete this driver profile?')) return;
    try {
      await window.api.delete(`/drivers/${id}`);
      window.api.showToast('Driver profile deleted successfully.', 'success');
      loadDrivers();
    } catch (err) {
      console.error(err);
    }
  }

  // --- TRIPS MODULE ---
  const tripsTableBody = document.getElementById('trips-table-body');
  const tripSearch = document.getElementById('trip-search');
  const filterTripStatus = document.getElementById('filter-trip-status');
  
  const tripModal = document.getElementById('trip-modal');
  const tripForm = document.getElementById('trip-form');
  const tripModalTitle = document.getElementById('trip-modal-title');
  const closeTripModal = document.getElementById('close-trip-modal');
  const btnCancelTrip = document.getElementById('btn-cancel-trip');

  async function loadTrips() {
    try {
      const search = tripSearch ? tripSearch.value.trim() : '';
      const status = filterTripStatus ? filterTripStatus.value : '';
      
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
      
      const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
      const trips = await window.api.get(`/trips${queryString}`);
      
      tripsTableBody.innerHTML = '';
      if (!trips.length) {
        tripsTableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
              No trips registered matching selected filters.
            </td>
          </tr>
        `;
        return;
      }
      
      trips.forEach(trip => {
        const row = document.createElement('tr');
        
        const isDraft = trip.status === 'Draft';
        const isDispatched = trip.status === 'Dispatched';
        
        const showEdit = ['driver', 'fleet_manager', 'admin'].includes(currentUser.role) && (isDraft || isDispatched);
        const showDelete = currentUser.role === 'admin';
        
        let statusActions = '';
        if (isDraft && ['fleet_manager', 'admin'].includes(currentUser.role)) {
          statusActions = `<button class="btn btn-secondary btn-status-action" data-id="${trip.id}" data-status="Dispatched" style="padding:4px 8px; font-size:0.75rem;">🚀 Dispatch</button>`;
        } else if (isDispatched && ['driver', 'fleet_manager', 'admin'].includes(currentUser.role)) {
          statusActions = `
            <button class="btn btn-primary btn-status-action" data-id="${trip.id}" data-status="Completed" style="padding:4px 8px; font-size:0.75rem; margin-right:4px;">✅ Complete</button>
            <button class="btn btn-secondary btn-status-action" data-id="${trip.id}" data-status="Cancelled" style="padding:4px 8px; font-size:0.75rem; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); color:#fca5a5;">❌ Cancel</button>
          `;
        }

        row.innerHTML = `
          <td>${trip.source}</td>
          <td>${trip.destination}</td>
          <td>
            <div style="font-weight: 700; color: #a5b4fc;">${trip.vehicle_registration || 'N/A'}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${trip.vehicle_model || ''}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${trip.driver_name || 'N/A'}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${trip.driver_license || ''}</div>
          </td>
          <td>${parseFloat(trip.cargo_weight).toLocaleString()} kg</td>
          <td>${parseFloat(trip.planned_distance).toLocaleString()} km</td>
          <td>
            <span class="status-pill ${trip.status.toLowerCase()}">
              ${trip.status}
            </span>
          </td>
          <td class="actions-cell" style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
            <div style="display:flex; gap:6px;">
              ${showEdit ? `<button class="action-btn btn-edit-trip" title="Edit Trip" data-id="${trip.id}">✏️</button>` : ''}
              ${showDelete ? `<button class="action-btn btn-delete-trip" title="Delete Trip" data-id="${trip.id}">🗑️</button>` : ''}
            </div>
            ${statusActions}
          </td>
        `;
        tripsTableBody.appendChild(row);
      });
      
      // Bind actions
      tripsTableBody.querySelectorAll('.btn-edit-trip').forEach(btn => {
        btn.addEventListener('click', () => editTrip(btn.getAttribute('data-id')));
      });
      
      tripsTableBody.querySelectorAll('.btn-delete-trip').forEach(btn => {
        btn.addEventListener('click', () => deleteTrip(btn.getAttribute('data-id')));
      });

      tripsTableBody.querySelectorAll('.btn-status-action').forEach(btn => {
        btn.addEventListener('click', () => updateTripStatus(btn.getAttribute('data-id'), btn.getAttribute('data-status')));
      });
      
    } catch (err) {
      console.error('Error fetching trips', err);
    }
  }

  // Bind filters
  if (tripSearch) {
    tripSearch.addEventListener('input', debounce(loadTrips, 300));
  }
  if (filterTripStatus) {
    filterTripStatus.addEventListener('change', loadTrips);
  }

  async function loadAvailableVehiclesAndDrivers(selectedVehicleId = null, selectedDriverId = null) {
    try {
      const vehicles = await window.api.get('/vehicles');
      const drivers = await window.api.get('/drivers');
      
      const vehicleSelect = document.getElementById('trip-vehicle');
      const driverSelect = document.getElementById('trip-driver');
      
      vehicleSelect.innerHTML = '<option value="">-- Select Available Vehicle --</option>';
      driverSelect.innerHTML = '<option value="">-- Select Available Driver --</option>';
      
      // Filter vehicles that are Available OR currently assigned to this trip (for edit mode)
      const availableVehicles = vehicles.filter(v => v.status === 'Available' || v.id === parseInt(selectedVehicleId));
      availableVehicles.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.registration_number} - ${v.model} (Max: ${v.max_capacity} kg)`;
        if (v.id === parseInt(selectedVehicleId)) option.selected = true;
        vehicleSelect.appendChild(option);
      });
      
      // Filter drivers that are Available OR currently assigned, AND have a valid driving license (not expired) and not Suspended
      const today = new Date();
      const availableDrivers = drivers.filter(d => {
        const isExpired = new Date(d.license_expiry_date) < today;
        return (d.status === 'Available' || d.id === parseInt(selectedDriverId)) && !isExpired && d.status !== 'Suspended';
      });
      
      availableDrivers.forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = `${d.name} (${d.license_category}, Score: ${d.safety_score})`;
        if (d.id === parseInt(selectedDriverId)) option.selected = true;
        driverSelect.appendChild(option);
      });
      
    } catch(err) {
      console.error('Error populating available vehicles/drivers selection', err);
    }
  }

  async function openTripFormModal(trip = null) {
    tripForm.reset();
    document.getElementById('trip-id').value = '';
    
    if (trip) {
      tripModalTitle.textContent = 'Edit Trip Details';
      document.getElementById('trip-id').value = trip.id;
      document.getElementById('trip-source').value = trip.source;
      document.getElementById('trip-destination').value = trip.destination;
      document.getElementById('trip-weight').value = trip.cargo_weight;
      document.getElementById('trip-distance').value = trip.planned_distance;
      document.getElementById('trip-status').value = trip.status;
      document.getElementById('trip-revenue').value = trip.revenue;
      
      await loadAvailableVehiclesAndDrivers(trip.vehicle_id, trip.driver_id);
      document.getElementById('btn-save-trip').textContent = 'Save Changes';
    } else {
      tripModalTitle.textContent = 'Create Trip';
      document.getElementById('trip-status').value = 'Draft';
      document.getElementById('trip-revenue').value = 0;
      
      await loadAvailableVehiclesAndDrivers();
      document.getElementById('btn-save-trip').textContent = 'Create Trip';
    }
    
    tripModal.classList.add('active');
  }

  function closeTripModalCard() {
    tripModal.classList.remove('active');
  }

  if (closeTripModal) closeTripModal.addEventListener('click', closeTripModalCard);
  if (btnCancelTrip) btnCancelTrip.addEventListener('click', closeTripModalCard);
  
  tripForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('trip-id').value;
    const tripData = {
      source: document.getElementById('trip-source').value,
      destination: document.getElementById('trip-destination').value,
      vehicle_id: document.getElementById('trip-vehicle').value,
      driver_id: document.getElementById('trip-driver').value,
      cargo_weight: document.getElementById('trip-weight').value,
      planned_distance: document.getElementById('trip-distance').value,
      status: document.getElementById('trip-status').value,
      revenue: document.getElementById('trip-revenue').value
    };
    
    try {
      if (id) {
        await window.api.put(`/trips/${id}`, tripData);
        window.api.showToast('Trip record updated successfully.', 'success');
      } else {
        await window.api.post('/trips', tripData);
        window.api.showToast('New trip record created successfully.', 'success');
      }
      closeTripModalCard();
      loadTrips();
    } catch (err) {
      console.error(err);
    }
  });

  async function editTrip(id) {
    try {
      const trip = await window.api.get(`/trips/${id}`);
      openTripFormModal(trip);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTrip(id) {
    if (!confirm('Are you sure you want to delete this trip record?')) return;
    try {
      await window.api.delete(`/trips/${id}`);
      window.api.showToast('Trip record deleted successfully.', 'success');
      loadTrips();
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTripStatus(id, newStatus) {
    try {
      await window.api.put(`/trips/${id}`, { status: newStatus });
      window.api.showToast(`Trip successfully updated to '${newStatus}'.`, 'success');
      loadTrips();
    } catch (err) {
      console.error(err);
    }
  }

  // --- HELPER UTILITIES ---
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // --- Initialize Panel ---
  loadKPIs();
});
