const db = require('../config/db');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Fetch main dashboard analytics KPIs (3.2 & 3.8)
 */
const getDashboardKPIs = asyncHandler(async (req, res) => {
  // 1. Vehicle counts
  const vehiclesRes = await db.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Available') as available,
      COUNT(*) FILTER (WHERE status = 'On Trip') as active,
      COUNT(*) FILTER (WHERE status = 'In Shop') as maintenance,
      COUNT(*) FILTER (WHERE status = 'Retired') as retired
    FROM vehicles;
  `);

  // 2. Driver counts
  const driversRes = await db.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Available') as available,
      COUNT(*) FILTER (WHERE status = 'On Trip') as active,
      COUNT(*) FILTER (WHERE status = 'Off Duty') as off_duty,
      COUNT(*) FILTER (WHERE status = 'Suspended') as suspended
    FROM drivers;
  `);

  // 3. Trip counts
  const tripsRes = await db.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Draft') as draft,
      COUNT(*) FILTER (WHERE status = 'Dispatched') as dispatched,
      COUNT(*) FILTER (WHERE status = 'Completed') as completed,
      COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled
    FROM trips;
  `);

  const vCounts = vehiclesRes.rows[0];
  const dCounts = driversRes.rows[0];
  const tCounts = tripsRes.rows[0];

  // Calculate fleet utilization %: (Vehicles on trip / (Total vehicles - Retired)) * 100
  const activeCount = parseInt(vCounts.active, 10);
  const eligibleVehicles = parseInt(vCounts.total, 10) - parseInt(vCounts.retired, 10);
  const fleetUtilization = eligibleVehicles > 0 ? ((activeCount / eligibleVehicles) * 100).toFixed(2) : '0.00';

  res.status(200).json(new ApiResponse(200, {
    vehicles: {
      total: parseInt(vCounts.total, 10),
      available: parseInt(vCounts.available, 10),
      active: activeCount,
      maintenance: parseInt(vCounts.maintenance, 10),
      retired: parseInt(vCounts.retired, 10),
      utilization_percentage: parseFloat(fleetUtilization)
    },
    drivers: {
      total: parseInt(dCounts.total, 10),
      available: parseInt(dCounts.available, 10),
      active: parseInt(dCounts.active, 10),
      off_duty: parseInt(dCounts.off_duty, 10),
      suspended: parseInt(dCounts.suspended, 10)
    },
    trips: {
      total: parseInt(tCounts.total, 10),
      draft: parseInt(tCounts.draft, 10),
      dispatched: parseInt(tCounts.dispatched, 10),
      completed: parseInt(tCounts.completed, 10),
      cancelled: parseInt(tCounts.cancelled, 10)
    }
  }, 'Dashboard KPIs computed successfully.'));
});

/**
 * Fetch detailed metrics per vehicle for Reports & Analytics table (3.8)
 */
const getReportsSummary = async () => {
  const queryText = `
    SELECT 
      v.id as vehicle_id,
      v.registration_number,
      v.model,
      v.type,
      v.status,
      v.acquisition_cost,
      v.odometer,
      COALESCE((SELECT SUM(cost) FROM fuel_logs WHERE vehicle_id = v.id), 0.00) as fuel_cost,
      COALESCE((SELECT SUM(liters) FROM fuel_logs WHERE vehicle_id = v.id), 0.00) as fuel_liters,
      COALESCE((SELECT SUM(cost) FROM maintenance_logs WHERE vehicle_id = v.id), 0.00) as maintenance_cost,
      COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id), 0.00) as other_expenses,
      COALESCE((SELECT SUM(revenue) FROM trips WHERE vehicle_id = v.id AND status = 'Completed'), 0.00) as revenue,
      COALESCE((SELECT SUM(planned_distance) FROM trips WHERE vehicle_id = v.id AND status = 'Completed'), 0.00) as distance_traveled
    FROM vehicles v
    ORDER BY v.registration_number ASC;
  `;

  const { rows } = await db.query(queryText);

  // Compute calculated ratios in Javascript for higher precision and fallback logic
  return rows.map(v => {
    const acqCost = parseFloat(v.acquisition_cost);
    const fuelCost = parseFloat(v.fuel_cost);
    const fuelLiters = parseFloat(v.fuel_liters);
    const maintCost = parseFloat(v.maintenance_cost);
    const otherCost = parseFloat(v.other_expenses);
    const revenue = parseFloat(v.revenue);
    const distance = parseFloat(v.distance_traveled);

    // Fuel Efficiency = Distance / Fuel
    const fuelEfficiency = fuelLiters > 0 ? (distance / fuelLiters).toFixed(2) : '0.00';

    // Total operational cost = Fuel + Maintenance + other expenses
    const totalOperationalCost = (fuelCost + maintCost + otherCost).toFixed(2);

    // Vehicle ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    const netEarnings = revenue - (maintCost + fuelCost);
    const roi = acqCost > 0 ? (netEarnings / acqCost).toFixed(4) : '0.0000';

    return {
      vehicle_id: v.vehicle_id,
      registration_number: v.registration_number,
      model: v.model,
      type: v.type,
      status: v.status,
      acquisition_cost: acqCost,
      fuel_liters: fuelLiters,
      fuel_cost: fuelCost,
      maintenance_cost: maintCost,
      other_expenses: otherCost,
      total_operational_cost: parseFloat(totalOperationalCost),
      revenue: revenue,
      distance_traveled: distance,
      fuel_efficiency: parseFloat(fuelEfficiency),
      roi: parseFloat(roi)
    };
  });
};

/**
 * Handle HTTP request for reports data
 */
const getReports = asyncHandler(async (req, res) => {
  const reports = await getReportsSummary();
  res.status(200).json(new ApiResponse(200, reports, 'Reports details retrieved successfully.'));
});

/**
 * Export reports as CSV file (3.8)
 */
const exportReportsCSV = asyncHandler(async (req, res) => {
  const reports = await getReportsSummary();

  // Create CSV Header
  let csvContent = 'Registration Number,Model,Type,Status,Acquisition Cost,Fuel Liters,Fuel Cost,Maintenance Cost,Other Expenses,Total Revenue,Distance Traveled,Fuel Efficiency (km/L),ROI\n';

  // Append records
  reports.forEach(r => {
    csvContent += `"${r.registration_number}","${r.model}","${r.type}","${r.status}",${r.acquisition_cost},${r.fuel_liters},${r.fuel_cost},${r.maintenance_cost},${r.other_expenses},${r.revenue},${r.distance_traveled},${r.fuel_efficiency},${r.roi}\n`;
  });

  // Set file response headers
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transitops_fleet_report.csv');
  
  res.status(200).send(csvContent);
});

module.exports = {
  getDashboardKPIs,
  getReports,
  exportReportsCSV
};
