const db = require('../config/db');

/**
 * Model representing Vehicle entity in TransitOps database
 */
class VehicleModel {
  /**
   * Create a new vehicle record
   */
  static async create({ registration_number, model, type, max_capacity, odometer, acquisition_cost, status = 'Available' }) {
    const queryText = `
      INSERT INTO vehicles (registration_number, model, type, max_capacity, odometer, acquisition_cost, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      registration_number.toUpperCase().trim(),
      model.trim(),
      type.trim(),
      parseFloat(max_capacity),
      parseFloat(odometer),
      parseFloat(acquisition_cost),
      status
    ];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Find vehicles with optional filters
   */
  static async findAll({ type, status, search } = {}) {
    let queryText = `SELECT * FROM vehicles WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      values.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (registration_number ILIKE $${paramIndex} OR model ILIKE $${paramIndex} OR type ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  /**
   * Find vehicle by ID
   */
  static async findById(id) {
    const queryText = `SELECT * FROM vehicles WHERE id = $1;`;
    const { rows } = await db.query(queryText, [id]);
    return rows[0] || null;
  }

  /**
   * Find vehicle by Registration Number
   */
  static async findByRegistrationNumber(regNum) {
    const queryText = `SELECT * FROM vehicles WHERE registration_number = $1;`;
    const { rows } = await db.query(queryText, [regNum.toUpperCase().trim()]);
    return rows[0] || null;
  }

  /**
   * Update vehicle details
   */
  static async update(id, { model, type, max_capacity, odometer, acquisition_cost, status }) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const finalModel = model !== undefined ? model.trim() : existing.model;
    const finalType = type !== undefined ? type.trim() : existing.type;
    const finalMaxCapacity = max_capacity !== undefined ? parseFloat(max_capacity) : existing.max_capacity;
    const finalOdometer = odometer !== undefined ? parseFloat(odometer) : existing.odometer;
    const finalAcquisitionCost = acquisition_cost !== undefined ? parseFloat(acquisition_cost) : existing.acquisition_cost;
    const finalStatus = status !== undefined ? status : existing.status;

    const queryText = `
      UPDATE vehicles
      SET model = $1, type = $2, max_capacity = $3, odometer = $4, acquisition_cost = $5, status = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;
    const values = [finalModel, finalType, finalMaxCapacity, finalOdometer, finalAcquisitionCost, finalStatus, id];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Delete vehicle
   */
  static async delete(id) {
    const queryText = `DELETE FROM vehicles WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(queryText, [id]);
    return rows.length > 0;
  }
}

module.exports = VehicleModel;
