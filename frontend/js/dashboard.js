// TransitOps Dashboard Integration Logic
document.addEventListener('DOMContentLoaded', () => {
  // --- Check Authenticated Session ---
  const token = localStorage.getItem('token');
  const userJSON = localStorage.getItem('user');

  if (!token || !userJSON) {
    window.location.href = 'login.html';
    return;
  }

  const currentUser = JSON.parse(userJSON);
  
  // --- DOM Elements ---
  const userEmailEl = document.getElementById('user-email');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarTextEl = document.getElementById('user-avatar-text');
  const welcomeUsernameEl = document.getElementById('welcome-username');
  const btnLogout = document.getElementById('btn-logout');
  
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
  userEmailEl.textContent = currentUser.email;
  // Format role tag (e.g. fleet_manager -> Fleet Manager)
  userRoleEl.textContent = currentUser.role.replace('_', ' ');
  userAvatarTextEl.textContent = currentUser.email.charAt(0).toUpperCase();
  welcomeUsernameEl.textContent = currentUser.email.split('@')[0];

  // Logout Trigger
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.api.showToast('Signed out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  });

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
