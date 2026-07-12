const db = require('../config/db');

/**
 * Model representing Fuel Logs and Operating Expenses in TransitOps database
 */
class ExpenseModel {
  // ==========================================
  // FUEL LOGS
  // ==========================================

  /**
   * Log a new fuel purchase
   */
  static async createFuelLog({ vehicle_id, liters, cost, logged_at }) {
    const queryText = `
      INSERT INTO fuel_logs (vehicle_id, liters, cost, logged_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
      vehicle_id,
      parseFloat(liters),
      parseFloat(cost),
      logged_at || new Date().toISOString().split('T')[0]
    ];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Retrieve fuel logs
   */
  static async getFuelLogs({ vehicle_id } = {}) {
    let queryText = `
      SELECT f.*, v.registration_number as vehicle_registration, v.model as vehicle_model
      FROM fuel_logs f
      LEFT JOIN vehicles v ON f.vehicle_id = v.id
      WHERE 1=1
    `;
    const values = [];
    if (vehicle_id) {
      queryText += ` AND f.vehicle_id = $1`;
      values.push(parseInt(vehicle_id, 10));
    }
    queryText += ` ORDER BY f.logged_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  // ==========================================
  // OTHER EXPENSES
  // ==========================================

  /**
   * Create an operating expense (tolls, permits, insurance, etc.)
   */
  static async createExpense({ vehicle_id, type, cost, logged_at }) {
    const queryText = `
      INSERT INTO expenses (vehicle_id, type, cost, logged_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
      vehicle_id,
      type.trim(),
      parseFloat(cost),
      logged_at || new Date().toISOString().split('T')[0]
    ];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Retrieve operating expenses
   */
  static async getExpenses({ vehicle_id } = {}) {
    let queryText = `
      SELECT e.*, v.registration_number as vehicle_registration, v.model as vehicle_model
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      WHERE 1=1
    `;
    const values = [];
    if (vehicle_id) {
      queryText += ` AND e.vehicle_id = $1`;
      values.push(parseInt(vehicle_id, 10));
    }
    queryText += ` ORDER BY e.logged_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  // ==========================================
  // TOTAL OPERATIONAL COSTS (3.7)
  // ==========================================

  /**
   * Get operational costs per vehicle (Fuel + Maintenance + Other Expenses)
   */
  static async getOperationalCostsSummary(vehicle_id = null) {
    let queryText = `
      SELECT 
        v.id as vehicle_id,
        v.registration_number,
        v.model,
        v.type,
        v.acquisition_cost,
        COALESCE((SELECT SUM(cost) FROM fuel_logs WHERE vehicle_id = v.id), 0.00) as total_fuel_cost,
        COALESCE((SELECT SUM(cost) FROM maintenance_logs WHERE vehicle_id = v.id), 0.00) as total_maintenance_cost,
        COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id), 0.00) as total_other_expense_cost,
        (
          COALESCE((SELECT SUM(cost) FROM fuel_logs WHERE vehicle_id = v.id), 0.00) +
          COALESCE((SELECT SUM(cost) FROM maintenance_logs WHERE vehicle_id = v.id), 0.00) +
          COALESCE((SELECT SUM(cost) FROM expenses WHERE vehicle_id = v.id), 0.00)
        ) as total_operational_cost,
        COALESCE((SELECT SUM(revenue) FROM trips WHERE vehicle_id = v.id AND status = 'Completed'), 0.00) as total_revenue
      FROM vehicles v
    `;
    const values = [];
    if (vehicle_id) {
      queryText += ` WHERE v.id = $1`;
      values.push(parseInt(vehicle_id, 10));
    }
    queryText += ` ORDER BY total_operational_cost DESC`;

    const { rows } = await db.query(queryText, values);
    return vehicle_id ? rows[0] || null : rows;
  }
}

module.exports = ExpenseModel;
