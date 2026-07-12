// TransitOps Client-Side Mock Database & API Interceptor Fallback
// Enables full offline demo capability if the backend server is unreachable

(() => {
  // Helper to load/save tables in LocalStorage
  const loadDb = (key, defaultVal) => {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(data);
  };

  const saveDb = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Seed Data Definitions
  const seedVehicles = [
    { id: 1, registration_number: 'VAN-01', model: 'Ford Transit 2022', type: 'Van', max_capacity: 1200.00, odometer: 45200.50, acquisition_cost: 32000.00, status: 'Available' },
    { id: 2, registration_number: 'VAN-02', model: 'Mercedes Sprinter 2023', type: 'Van', max_capacity: 1500.00, odometer: 18400.20, acquisition_cost: 45000.00, status: 'Available' },
    { id: 3, registration_number: 'VAN-03', model: 'Nissan NV2500 2021', type: 'Van', max_capacity: 1000.00, odometer: 85600.00, acquisition_cost: 28000.00, status: 'On Trip' },
    { id: 4, registration_number: 'VAN-05', model: 'Chevrolet Express 2020', type: 'Van', max_capacity: 500.00, odometer: 112000.10, acquisition_cost: 24000.00, status: 'Available' },
    { id: 5, registration_number: 'TRUCK-01', model: 'Volvo FH16 Heavy Duty', type: 'Truck', max_capacity: 18000.00, odometer: 254100.80, acquisition_cost: 115000.00, status: 'Available' },
    { id: 6, registration_number: 'TRUCK-02', model: 'Scania R500 Flatbed', type: 'Truck', max_capacity: 15000.00, odometer: 142300.00, acquisition_cost: 98000.00, status: 'In Shop' },
    { id: 7, registration_number: 'SEDAN-01', model: 'Toyota Prius Hybrid', type: 'Sedan', max_capacity: 350.00, odometer: 62000.40, acquisition_cost: 22000.00, status: 'Retired' }
  ];

  const seedDrivers = [
    { id: 1, name: 'Alex Mercer', license_number: 'DL-98214532', license_category: 'Class B Commercial', license_expiry_date: '2027-10-15', contact_number: '+1-555-0199', safety_score: 95.50, status: 'Available' },
    { id: 2, name: 'Bob Builder', license_number: 'DL-88241242', license_category: 'Class A Commercial', license_expiry_date: '2028-03-22', contact_number: '+1-555-0144', safety_score: 98.00, status: 'Available' },
    { id: 3, name: 'Charlie Cox', license_number: 'DL-72314152', license_category: 'Class B Commercial', license_expiry_date: '2027-08-01', contact_number: '+1-555-0185', safety_score: 92.00, status: 'On Trip' },
    { id: 4, name: 'Daniel Craig', license_number: 'DL-61245152', license_category: 'Standard Class C', license_expiry_date: '2025-01-01', contact_number: '+1-555-0112', safety_score: 88.50, status: 'Off Duty' },
    { id: 5, name: 'Emily Blunt', license_number: 'DL-55246261', license_category: 'Class A Commercial', license_expiry_date: '2029-06-18', contact_number: '+1-555-0131', safety_score: 97.20, status: 'Available' },
    { id: 6, name: 'Frank Castle', license_number: 'DL-44125251', license_category: 'Class B Commercial', license_expiry_date: '2027-12-05', contact_number: '+1-555-0177', safety_score: 74.00, status: 'Suspended' }
  ];

  const seedTrips = [
    { id: 1, source: 'Warehouse A (Chicago)', destination: 'Distribution Center (Detroit)', vehicle_id: 1, driver_id: 1, cargo_weight: 950.00, planned_distance: 450.00, status: 'Completed', revenue: 1800.00 },
    { id: 2, source: 'HQ Terminal (New York)', destination: 'Retail Store B (Boston)', vehicle_id: 2, driver_id: 2, cargo_weight: 1200.00, planned_distance: 340.00, status: 'Completed', revenue: 1450.00 },
    { id: 3, source: 'Factory Plaza (Dallas)', destination: 'Shipping Hub (Houston)', vehicle_id: 3, driver_id: 3, cargo_weight: 850.00, planned_distance: 260.00, status: 'Dispatched', revenue: 1100.00 },
    { id: 4, source: 'Warehouse B (Seattle)', destination: 'Local Center (Tacoma)', vehicle_id: 4, driver_id: 5, cargo_weight: 450.00, planned_distance: 50.00, status: 'Draft', revenue: 300.00 }
  ];

  const seedMaintenance = [
    { id: 1, vehicle_id: 6, description: 'Engine Overhaul and spark plug replacement', cost: 1850.00, status: 'Active', logged_at: '2026-07-10' },
    { id: 2, vehicle_id: 1, description: 'Scheduled oil change and tire rotation', cost: 150.00, status: 'Closed', logged_at: '2026-06-15' },
    { id: 3, vehicle_id: 2, description: 'Brake pad replacement and brake fluid flush', cost: 450.00, status: 'Closed', logged_at: '2026-07-01' }
  ];

  const seedFuel = [
    { id: 1, vehicle_id: 1, liters: 120.00, cost: 180.00, logged_at: '2026-07-01' },
    { id: 2, vehicle_id: 1, liters: 130.00, cost: 195.00, logged_at: '2026-07-10' },
    { id: 3, vehicle_id: 2, liters: 90.00, cost: 135.00, logged_at: '2026-07-02' },
    { id: 4, vehicle_id: 2, liters: 95.00, cost: 142.50, logged_at: '2026-07-09' },
    { id: 5, vehicle_id: 3, liters: 80.00, cost: 120.00, logged_at: '2026-07-08' },
    { id: 6, vehicle_id: 4, liters: 40.00, cost: 60.00, logged_at: '2026-07-05' },
    { id: 7, vehicle_id: 5, liters: 450.00, cost: 675.00, logged_at: '2026-07-04' }
  ];

  const seedExpenses = [
    { id: 1, vehicle_id: 1, type: 'Tolls', cost: 45.00, logged_at: '2026-07-01' },
    { id: 2, vehicle_id: 2, type: 'Tolls', cost: 30.00, logged_at: '2026-07-02' },
    { id: 3, vehicle_id: 3, type: 'Tolls', cost: 25.00, logged_at: '2026-07-08' },
    { id: 4, vehicle_id: 5, type: 'Permits', cost: 150.00, logged_at: '2026-07-04' }
  ];

  const seedDocuments = [
    { id: 1, vehicle_id: 1, document_name: 'Registration Card', file_name: 'Registration_VAN-01.pdf', file_size: 131072, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 2, vehicle_id: 1, document_name: 'Insurance Policy', file_name: 'Insurance_VAN-01.pdf', file_size: 262144, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 3, vehicle_id: 2, document_name: 'Registration Card', file_name: 'Registration_TRK-02.pdf', file_size: 131072, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 4, vehicle_id: 2, document_name: 'Insurance Policy', file_name: 'Insurance_TRK-02.pdf', file_size: 262144, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 5, vehicle_id: 3, document_name: 'Registration Card', file_name: 'Registration_VAN-03.pdf', file_size: 131072, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 6, vehicle_id: 3, document_name: 'Insurance Policy', file_name: 'Insurance_VAN-03.pdf', file_size: 262144, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 7, vehicle_id: 4, document_name: 'Registration Card', file_name: 'Registration_TRK-04.pdf', file_size: 131072, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 8, vehicle_id: 4, document_name: 'Insurance Policy', file_name: 'Insurance_TRK-04.pdf', file_size: 262144, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 9, vehicle_id: 5, document_name: 'Registration Card', file_name: 'Registration_VAN-05.pdf', file_size: 131072, mime_type: 'application/pdf', created_at: new Date().toISOString() },
    { id: 10, vehicle_id: 5, document_name: 'Insurance Policy', file_name: 'Insurance_VAN-05.pdf', file_size: 262144, mime_type: 'application/pdf', created_at: new Date().toISOString() }
  ];

  // Global Intercept Function
  const handleMockRequest = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(init.body) : {};

    // Helper to build response wrapper
    const makeResponse = (data, status = 200) => {
      const responseBody = {
        status,
        message: (data && data.message) ? data.message : 'Mock response generated.',
        data
      };
      return new Response(JSON.stringify(responseBody), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    // Load local DB states
    const vehicles = loadDb('mock_vehicles', seedVehicles);
    const drivers = loadDb('mock_drivers', seedDrivers);
    const trips = loadDb('mock_trips', seedTrips);
    const maintenance = loadDb('mock_maintenance', seedMaintenance);
    const fuel = loadDb('mock_fuel', seedFuel);
    const expenses = loadDb('mock_expenses', seedExpenses);

    // --- 0. HEALTH CHECK MOCK ---
    if (url.includes('/health')) {
      return new Response(JSON.stringify({
        uptime: typeof performance !== 'undefined' ? performance.now() / 1000 : 100.0,
        message: 'OK',
        timestamp: Date.now(),
        database: 'CONNECTED'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- 1. AUTH LOG IN BYPASS ---
    if (url.includes('/auth/login')) {
      const email = body.email || 'guest@transitops.com';
      let role = body.role || 'manager'; // Default to manager for full demo access
      if (!body.role) {
          if (email.includes('driver')) role = 'driver';
          if (email.includes('safety')) role = 'safety_officer';
          if (email.includes('analyst') || email.includes('finance')) role = 'financial_analyst';
          if (email.includes('manager')) role = 'fleet_manager';
      }

      return makeResponse({
        token: 'mock-jwt-bypass-token-12345',
        user: { id: 999, email, role }
      });
    }

    // --- 2. VEHICLES CRUD ---
    if (url.includes('/vehicles') && !url.includes('/documents')) {
      const parts = url.split('/vehicles');
      const paramId = parts[1] ? parseInt(parts[1].replace('/', ''), 10) : null;

      if (method === 'GET') {
        if (paramId) {
          const v = vehicles.find(x => x.id === paramId);
          return v ? makeResponse(v) : makeResponse({ message: 'Vehicle not found' }, 404);
        }
        return makeResponse(vehicles);
      }

      if (method === 'POST') {
        const newV = {
          id: vehicles.length > 0 ? Math.max(...vehicles.map(x => x.id)) + 1 : 1,
          registration_number: body.registration_number.toUpperCase(),
          model: body.model,
          type: body.type,
          max_capacity: parseFloat(body.max_capacity),
          odometer: parseFloat(body.odometer),
          acquisition_cost: parseFloat(body.acquisition_cost),
          status: body.status || 'Available'
        };
        vehicles.push(newV);
        saveDb('mock_vehicles', vehicles);
        return makeResponse(newV, 201);
      }

      if (method === 'PUT' && paramId) {
        const vIndex = vehicles.findIndex(x => x.id === paramId);
        if (vIndex === -1) return makeResponse({ message: 'Vehicle not found' }, 404);
        vehicles[vIndex] = { ...vehicles[vIndex], ...body };
        saveDb('mock_vehicles', vehicles);
        return makeResponse(vehicles[vIndex]);
      }

      if (method === 'DELETE' && paramId) {
        const newVList = vehicles.filter(x => x.id !== paramId);
        saveDb('mock_vehicles', newVList);
        return makeResponse(null);
      }
    }

    // --- 3. DRIVERS CRUD ---
    if (url.includes('/drivers')) {
      const parts = url.split('/drivers');
      const paramId = parts[1] ? parseInt(parts[1].replace('/', ''), 10) : null;

      if (method === 'GET') {
        if (paramId) {
          const d = drivers.find(x => x.id === paramId);
          return d ? makeResponse(d) : makeResponse({ message: 'Driver not found' }, 404);
        }
        return makeResponse(drivers);
      }

      if (method === 'POST') {
        const newD = {
          id: drivers.length > 0 ? Math.max(...drivers.map(x => x.id)) + 1 : 1,
          name: body.name,
          license_number: body.license_number.toUpperCase(),
          license_category: body.license_category,
          license_expiry_date: body.license_expiry_date,
          contact_number: body.contact_number,
          safety_score: parseFloat(body.safety_score || 100),
          status: body.status || 'Available'
        };
        drivers.push(newD);
        saveDb('mock_drivers', drivers);
        return makeResponse(newD, 201);
      }

      if (method === 'PUT' && paramId) {
        const dIndex = drivers.findIndex(x => x.id === paramId);
        if (dIndex === -1) return makeResponse({ message: 'Driver not found' }, 404);
        drivers[dIndex] = { ...drivers[dIndex], ...body };
        saveDb('mock_drivers', drivers);
        return makeResponse(drivers[dIndex]);
      }

      if (method === 'DELETE' && paramId) {
        const newDList = drivers.filter(x => x.id !== paramId);
        saveDb('mock_drivers', newDList);
        return makeResponse(null);
      }
    }

    // --- 4. TRIPS CRUD ---
    if (url.includes('/trips')) {
      const parts = url.split('/trips');
      const paramId = parts[1] ? parseInt(parts[1].replace('/', ''), 10) : null;

      if (method === 'GET') {
        if (paramId) {
          const t = trips.find(x => x.id === paramId);
          if (t) {
            const v = vehicles.find(x => x.id === t.vehicle_id) || {};
            const d = drivers.find(x => x.id === t.driver_id) || {};
            return makeResponse({ ...t, vehicle_registration: v.registration_number, vehicle_model: v.model, driver_name: d.name, driver_license: d.license_number });
          }
          return makeResponse({ message: 'Trip not found' }, 404);
        }
        // Expand trips response
        const expanded = trips.map(t => {
          const v = vehicles.find(x => x.id === t.vehicle_id) || {};
          const d = drivers.find(x => x.id === t.driver_id) || {};
          return { ...t, vehicle_registration: v.registration_number, vehicle_model: v.model, driver_name: d.name, driver_license: d.license_number };
        });
        return makeResponse(expanded);
      }

      if (method === 'POST') {
        const v = vehicles.find(x => x.id === parseInt(body.vehicle_id, 10));
        const d = drivers.find(x => x.id === parseInt(body.driver_id, 10));

        if (!v) return makeResponse({ message: 'Vehicle not found' }, 400);
        if (!d) return makeResponse({ message: 'Driver not found' }, 400);

        // Validations
        if (v.status === 'Retired' || v.status === 'In Shop') {
          return makeResponse({ message: `Vehicle is in status '${v.status}' and cannot be dispatched.` }, 400);
        }
        if (d.status === 'Suspended') {
          return makeResponse({ message: `Driver is Suspended and cannot be assigned.` }, 400);
        }
        const today = new Date();
        const licenseExpiry = new Date(d.license_expiry_date);
        if (licenseExpiry < today) {
          return makeResponse({ message: `Driver License expired` }, 400);
        }
        if (body.status === 'Dispatched') {
          if (v.status === 'On Trip') {
            return makeResponse({ message: `Vehicle is already on an active trip.` }, 400);
          }
          if (d.status === 'On Trip') {
            return makeResponse({ message: `Driver is already on an active trip.` }, 400);
          }
        }
        if (parseFloat(body.cargo_weight) > parseFloat(v.max_capacity)) {
          return makeResponse({ message: `Cargo weight exceeds vehicle maximum capacity (${v.max_capacity} kg).` }, 400);
        }

        const newTrip = {
          id: trips.length > 0 ? Math.max(...trips.map(x => x.id)) + 1 : 1,
          source: body.source,
          destination: body.destination,
          vehicle_id: parseInt(body.vehicle_id, 10),
          driver_id: parseInt(body.driver_id, 10),
          cargo_weight: parseFloat(body.cargo_weight),
          planned_distance: parseFloat(body.planned_distance),
          status: body.status || 'Draft',
          revenue: parseFloat(body.revenue || 0)
        };

        trips.push(newTrip);
        saveDb('mock_trips', trips);

        // Sync statuses if dispatched
        if (newTrip.status === 'Dispatched') {
          v.status = 'On Trip';
          d.status = 'On Trip';
          saveDb('mock_vehicles', vehicles);
          saveDb('mock_drivers', drivers);
        }

        return makeResponse(newTrip, 201);
      }

      if (method === 'PUT' && paramId) {
        const tIndex = trips.findIndex(x => x.id === paramId);
        if (tIndex === -1) return makeResponse({ message: 'Trip not found' }, 404);

        const oldT = trips[tIndex];
        const newT = { ...oldT, ...body };

        const v = vehicles.find(x => x.id === newT.vehicle_id);
        const d = drivers.find(x => x.id === newT.driver_id);

        if (v && d) {
          if (oldT.status !== newT.status) {
            if (newT.status === 'Dispatched') {
              if (v.status === 'On Trip') {
                return makeResponse({ message: `Vehicle is already on an active trip.` }, 400);
              }
              if (d.status === 'On Trip') {
                return makeResponse({ message: `Driver is already on an active trip.` }, 400);
              }
              if (v.status === 'Retired' || v.status === 'In Shop') {
                return makeResponse({ message: `Vehicle is in status '${v.status}' and cannot be dispatched.` }, 400);
              }
              if (d.status === 'Suspended') {
                return makeResponse({ message: `Driver is Suspended and cannot be assigned.` }, 400);
              }
              const today = new Date();
              const licenseExpiry = new Date(d.license_expiry_date);
              if (licenseExpiry < today) {
                return makeResponse({ message: `Driver License expired` }, 400);
              }
              v.status = 'On Trip';
              d.status = 'On Trip';
            } else if (oldT.status === 'Dispatched' && (newT.status === 'Completed' || newT.status === 'Cancelled')) {
              v.status = 'Available';
              d.status = 'Available';
            }
            saveDb('mock_vehicles', vehicles);
            saveDb('mock_drivers', drivers);
          }
        }

        trips[tIndex] = newT;
        saveDb('mock_trips', trips);

        return makeResponse(newT);
      }

      if (method === 'DELETE' && paramId) {
        const newTList = trips.filter(x => x.id !== paramId);
        saveDb('mock_trips', newTList);
        return makeResponse(null);
      }
    }

    // --- 5. MAINTENANCE CRUD ---
    if (url.includes('/maintenance')) {
      const parts = url.split('/maintenance');
      const paramId = parts[1] ? parseInt(parts[1].replace('/', ''), 10) : null;

      if (method === 'GET') {
        if (paramId) {
          const m = maintenance.find(x => x.id === paramId);
          return m ? makeResponse(m) : makeResponse({ message: 'Log not found' }, 404);
        }
        // Expand
        const expanded = maintenance.map(m => {
          const v = vehicles.find(x => x.id === m.vehicle_id) || {};
          return { ...m, vehicle_registration: v.registration_number, vehicle_model: v.model };
        });
        return makeResponse(expanded);
      }

      if (method === 'POST') {
        const v = vehicles.find(x => x.id === parseInt(body.vehicle_id, 10));
        if (!v) return makeResponse({ message: 'Vehicle not found' }, 400);

        const newM = {
          id: maintenance.length > 0 ? Math.max(...maintenance.map(x => x.id)) + 1 : 1,
          vehicle_id: parseInt(body.vehicle_id, 10),
          description: body.description,
          cost: parseFloat(body.cost),
          status: body.status || 'Active',
          logged_at: body.logged_at || new Date().toISOString().split('T')[0]
        };

        maintenance.push(newM);
        saveDb('mock_maintenance', maintenance);

        if (newM.status === 'Active') {
          v.status = 'In Shop';
          saveDb('mock_vehicles', vehicles);
        }

        return makeResponse(newM, 201);
      }

      if (method === 'PUT' && paramId) {
        const mIndex = maintenance.findIndex(x => x.id === paramId);
        if (mIndex === -1) return makeResponse({ message: 'Log not found' }, 404);

        const oldM = maintenance[mIndex];
        const newM = { ...oldM, ...body };
        maintenance[mIndex] = newM;
        saveDb('mock_maintenance', maintenance);

        const v = vehicles.find(x => x.id === newM.vehicle_id);
        if (v) {
            if (newM.status === 'Closed') {
              if (v.status !== 'Retired') {
                v.status = 'Available';
              }
            } else if (newM.status === 'Active') {
              if (v.status !== 'Retired') {
                v.status = 'In Shop';
              }
            }
            saveDb('mock_vehicles', vehicles);
        }

        return makeResponse(newM);
      }

      if (method === 'DELETE' && paramId) {
        const newMList = maintenance.filter(x => x.id !== paramId);
        saveDb('mock_maintenance', newMList);
        return makeResponse(null);
      }
    }

    // --- 6. OPERATIONAL EXPENSES / FUEL ---
    if (url.includes('/expenses')) {
      if (url.includes('/fuel')) {
        if (method === 'GET') {
          const expanded = fuel.map(f => {
            const v = vehicles.find(x => x.id === f.vehicle_id) || {};
            return { ...f, vehicle_registration: v.registration_number, vehicle_model: v.model };
          });
          return makeResponse(expanded);
        }
        if (method === 'POST') {
          const newF = {
            id: fuel.length > 0 ? Math.max(...fuel.map(x => x.id)) + 1 : 1,
            vehicle_id: parseInt(body.vehicle_id, 10),
            liters: parseFloat(body.liters),
            cost: parseFloat(body.cost),
            logged_at: body.logged_at || new Date().toISOString().split('T')[0]
          };
          fuel.push(newF);
          saveDb('mock_fuel', fuel);
          return makeResponse(newF, 201);
        }
      }

      if (url.includes('/other')) {
        if (method === 'GET') {
          const expanded = expenses.map(e => {
            const v = vehicles.find(x => x.id === e.vehicle_id) || {};
            return { ...e, vehicle_registration: v.registration_number, vehicle_model: v.model };
          });
          return makeResponse(expanded);
        }
        if (method === 'POST') {
          const newE = {
            id: expenses.length > 0 ? Math.max(...expenses.map(x => x.id)) + 1 : 1,
            vehicle_id: parseInt(body.vehicle_id, 10),
            type: body.type,
            cost: parseFloat(body.cost),
            logged_at: body.logged_at || new Date().toISOString().split('T')[0]
          };
          expenses.push(newE);
          saveDb('mock_expenses', expenses);
          return makeResponse(newE, 201);
        }
      }

      if (url.includes('/summary')) {
        const summary = vehicles.map(v => {
          const fuelCost = fuel.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + f.cost, 0);
          const maintCost = maintenance.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + m.cost, 0);
          const otherCost = expenses.filter(e => e.vehicle_id === v.id).reduce((sum, e) => sum + e.cost, 0);
          return {
            vehicle_id: v.id,
            registration_number: v.registration_number,
            model: v.model,
            total_fuel_cost: fuelCost,
            total_maintenance_cost: maintCost,
            total_other_expense_cost: otherCost,
            total_operational_cost: fuelCost + maintCost + otherCost
          };
        });
        return makeResponse(summary);
      }
    }

    // --- 7. ANALYTICS ---
    if (url.includes('/analytics')) {
      if (url.includes('/kpis')) {
        const vTotal = vehicles.length;
        const vAvailable = vehicles.filter(x => x.status === 'Available').length;
        const vActive = vehicles.filter(x => x.status === 'On Trip').length;
        const vMaintenance = vehicles.filter(x => x.status === 'In Shop').length;
        const vRetired = vehicles.filter(x => x.status === 'Retired').length;

        const dTotal = drivers.length;
        const dAvailable = drivers.filter(x => x.status === 'Available').length;
        const dActive = drivers.filter(x => x.status === 'On Trip').length;
        const dOffDuty = drivers.filter(x => x.status === 'Off Duty').length;
        const dSuspended = drivers.filter(x => x.status === 'Suspended').length;

        const tTotal = trips.length;
        const tDraft = trips.filter(x => x.status === 'Draft').length;
        const tDispatched = trips.filter(x => x.status === 'Dispatched').length;
        const tCompleted = trips.filter(x => x.status === 'Completed').length;
        const tCancelled = trips.filter(x => x.status === 'Cancelled').length;

        const eligible = vTotal - vRetired;
        const fleetUtil = eligible > 0 ? ((vActive / eligible) * 100).toFixed(2) : '0.00';

        return makeResponse({
          vehicles: { total: vTotal, available: vAvailable, active: vActive, maintenance: vMaintenance, retired: vRetired, utilization_percentage: parseFloat(fleetUtil) },
          drivers: { total: dTotal, available: dAvailable, active: dActive, off_duty: dOffDuty, suspended: dSuspended },
          trips: { total: tTotal, draft: tDraft, dispatched: tDispatched, completed: tCompleted, cancelled: tCancelled }
        });
      }

      if (url.includes('/reports')) {
        const report = vehicles.map(v => {
          const fuelCost = fuel.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + f.cost, 0);
          const fuelLiters = fuel.filter(f => f.vehicle_id === v.id).reduce((sum, f) => sum + f.liters, 0);
          const maintCost = maintenance.filter(m => m.vehicle_id === v.id).reduce((sum, m) => sum + m.cost, 0);
          const otherCost = expenses.filter(e => e.vehicle_id === v.id).reduce((sum, e) => sum + e.cost, 0);
          
          const completedTrips = trips.filter(t => t.vehicle_id === v.id && t.status === 'Completed');
          const revenue = completedTrips.reduce((sum, t) => sum + t.revenue, 0);
          const distance = completedTrips.reduce((sum, t) => sum + t.planned_distance, 0);

          const fuelEfficiency = fuelLiters > 0 ? (distance / fuelLiters).toFixed(2) : '0.00';
          const roi = v.acquisition_cost > 0 ? ((revenue - (maintCost + fuelCost)) / v.acquisition_cost).toFixed(4) : '0.0000';

          return {
            vehicle_id: v.id,
            registration_number: v.registration_number,
            model: v.model,
            type: v.type,
            status: v.status,
            acquisition_cost: v.acquisition_cost,
            fuel_liters: fuelLiters,
            fuel_cost: fuelCost,
            maintenance_cost: maintCost,
            other_expenses: otherCost,
            total_operational_cost: fuelCost + maintCost + otherCost,
            revenue: revenue,
            distance_traveled: distance,
            fuel_efficiency: parseFloat(fuelEfficiency),
            roi: parseFloat(roi)
          };
        });
        return makeResponse(report);
      }
    }

    // --- VEHICLE DOCUMENTS MOCK ---
    if (url.includes('/vehicles/') && url.includes('/documents') && method === 'GET') {
      const parts = url.split('/');
      const vehicleId = parseInt(parts[parts.indexOf('vehicles') + 1], 10);
      const docs = loadDb('mock_documents', seedDocuments);
      const vehicleDocs = docs.filter(d => d.vehicle_id === vehicleId);
      return makeResponse(vehicleDocs);
    }

    if (url.includes('/vehicles/') && url.includes('/documents') && method === 'POST') {
      const parts = url.split('/');
      const vehicleId = parseInt(parts[parts.indexOf('vehicles') + 1], 10);
      const docs = loadDb('mock_documents', seedDocuments);
      const newDoc = {
        id: docs.length > 0 ? Math.max(...docs.map(x => x.id)) + 1 : 1,
        vehicle_id: vehicleId,
        document_name: body.document_name,
        file_name: body.file_name,
        file_size: body.file_size,
        mime_type: body.mime_type,
        created_at: new Date()
      };
      docs.push(newDoc);
      saveDb('mock_documents', docs);
      return makeResponse(newDoc, 201);
    }

    if (url.includes('/vehicles/documents/') && method === 'GET') {
      const parts = url.split('/');
      const docId = parseInt(parts[parts.indexOf('documents') + 1], 10);
      const docs = loadDb('mock_documents', seedDocuments);
      const doc = docs.find(x => x.id === docId);
      if (!doc) return makeResponse({ message: 'Document not found' }, 404);
      
      let fileData = doc.file_data;
      if (!fileData) {
        // Generate mock data containing vehicle details
        const vehicle = vehicles.find(v => v.id === doc.vehicle_id) || {
          registration_number: 'N/A',
          model: 'N/A',
          type: 'N/A',
          odometer: 0,
          max_capacity: 0,
          status: 'N/A'
        };

        if (doc.file_name.endsWith('.pdf')) {
          // Helper to escape parenthesis characters inside PDF text string operators
          const escapePdf = (text) => String(text || '').replace(/[\(\)\\]/g, '\\$&');

          // Dynamic uncompressed PDF generator containing vehicle details
          const lines = [
            `BT`,
            `/F1 18 Tf`,
            `70 750 Td`,
            `(${escapePdf(doc.document_name)}) Tj`,
            `/F1 12 Tf`,
            `0 -40 Td`,
            `(Vehicle Registration: ${escapePdf(vehicle.registration_number)}) Tj`,
            `0 -25 Td`,
            `(Model Name: ${escapePdf(vehicle.model)}) Tj`,
            `0 -25 Td`,
            `(Vehicle Type: ${escapePdf(vehicle.type)}) Tj`,
            `0 -25 Td`,
            `(Current Odometer: ${parseFloat(vehicle.odometer).toLocaleString()} km) Tj`,
            `0 -25 Td`,
            `(Max Cargo Capacity: ${parseFloat(vehicle.max_capacity).toLocaleString()} kg) Tj`,
            `0 -25 Td`,
            `(Operational Status: ${escapePdf(vehicle.status)}) Tj`,
            `0 -40 Td`,
            `(This certificate verifies the active registration and compliance logs of the vehicle.) Tj`,
            `0 -20 Td`,
            `(Generated dynamically on: ${new Date().toLocaleDateString()}) Tj`,
            `ET`
          ];
          
          const streamContent = lines.join('\n');
          const streamLength = streamContent.length;
          
          const pdfParts = [
            `%PDF-1.4\n`,
            `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
            `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
            `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n`,
            `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
            `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`
          ];
          
          const offsets = [];
          let currentOffset = 0;
          for (let i = 1; i < pdfParts.length; i++) {
            currentOffset += pdfParts[i - 1].length;
            offsets.push(currentOffset);
          }
          
          const startXref = currentOffset + pdfParts[pdfParts.length - 1].length;
          const padOffset = (offset) => String(offset).padStart(10, '0');
          
          const pdf = pdfParts.join('') +
            `xref\r\n0 6\r\n0000000000 65535 f\r\n` +
            `${padOffset(offsets[0])} 00000 n\r\n` +
            `${padOffset(offsets[1])} 00000 n\r\n` +
            `${padOffset(offsets[2])} 00000 n\r\n` +
            `${padOffset(offsets[3])} 00000 n\r\n` +
            `${padOffset(offsets[4])} 00000 n\r\n` +
            `trailer\r\n<< /Size 6 /Root 1 0 R >>\r\n` +
            `startxref\r\n${startXref}\r\n%%EOF\r\n`;
            
          fileData = 'data:application/pdf;base64,' + btoa(pdf);
        } else {
          // Dynamic SVG containing vehicle details
          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
              <rect width="100%" height="100%" fill="#1e1e24" />
              <rect x="20" y="20" width="560" height="360" rx="15" fill="none" stroke="#22d3ee" stroke-width="2" />
              <text x="300" y="70" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#22d3ee" text-anchor="middle">
                ${doc.document_name.toUpperCase()}
              </text>
              <text x="80" y="140" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#f8fafc">Registration: ${vehicle.registration_number}</text>
              <text x="80" y="175" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#f8fafc">Model: ${vehicle.model}</text>
              <text x="80" y="210" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#f8fafc">Type: ${vehicle.type}</text>
              <text x="80" y="245" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#f8fafc">Odometer: ${parseFloat(vehicle.odometer).toLocaleString()} km</text>
              <text x="80" y="280" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#f8fafc">Capacity: ${parseFloat(vehicle.max_capacity).toLocaleString()} kg</text>
              <text x="80" y="315" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#f8fafc">Status: ${vehicle.status}</text>
              <text x="300" y="360" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">
                Official compliance file mock. Generated dynamically on ${new Date().toLocaleDateString()}
              </text>
            </svg>
          `.trim();
          
          fileData = 'data:image/svg+xml;base64,' + btoa(svg);
        }
      }

      return makeResponse({
        id: doc.id,
        vehicle_id: doc.vehicle_id,
        document_name: doc.document_name,
        file_name: doc.file_name,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        file_data: fileData
      });
    }

    if (url.includes('/vehicles/documents/') && method === 'DELETE') {
      const parts = url.split('/');
      const docId = parseInt(parts[parts.indexOf('documents') + 1], 10);
      const docs = loadDb('mock_documents', seedDocuments);
      const newDocList = docs.filter(x => x.id !== docId);
      saveDb('mock_documents', newDocList);
      return makeResponse(null);
    }

    return makeResponse({ message: 'Endpoint mock not matched' }, 404);
  };

  // Intercept fetch API calls
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    try {
      return await originalFetch(resource, init);
    } catch (error) {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (url.includes('/api/v1') || url.includes('/auth/login') || url.includes('/vehicles') || url.includes('/drivers') || url.includes('/trips') || url.includes('/maintenance') || url.includes('/expenses') || url.includes('/analytics')) {
        console.warn(`[TransitOps Mock API Interceptor] Network failure or server offline. Mocking URL: ${url}`);
        return handleMockRequest(url, init);
      }
      throw error;
    }
  };

  console.log('[TransitOps Mock Interceptor] Staged successfully. Frontend will auto-fallback to client-side Mock DB if server is down.');
})();
