const db = require('../config/db');
const VehicleModel = require('./vehicle.model');

/**
 * Model representing Maintenance logs with transaction integration in TransitOps database
 */
class MaintenanceModel {
  /**
   * Create a new maintenance record (triggers vehicle status change to 'In Shop')
   */
  static async create({ vehicle_id, description, cost, status = 'Active', logged_at }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Check vehicle exists and is not retired
      const vehicle = await VehicleModel.findById(vehicle_id);
      if (!vehicle) {
        throw new Error(`Vehicle with ID ${vehicle_id} not found.`);
      }
      if (vehicle.status === 'Retired') {
        throw new Error(`Vehicle ${vehicle.registration_number} is Retired and cannot be put in maintenance.`);
      }

      // Create log
      const insertQuery = `
        INSERT INTO maintenance_logs (vehicle_id, description, cost, status, logged_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [
        vehicle_id,
        description.trim(),
        parseFloat(cost),
        status,
        logged_at || new Date().toISOString().split('T')[0]
      ];
      const result = await client.query(insertQuery, values);
      const newLog = result.rows[0];

      // If log is Active, switch vehicle status to 'In Shop'
      if (status === 'Active') {
        await client.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1;", [vehicle_id]);
      }

      await client.query('COMMIT');
      return newLog;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve all maintenance logs
   */
  static async findAll({ status, vehicle_id } = {}) {
    let queryText = `
      SELECT m.*, v.registration_number as vehicle_registration, v.model as vehicle_model
      FROM maintenance_logs m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND m.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (vehicle_id) {
      queryText += ` AND m.vehicle_id = $${paramIndex}`;
      values.push(parseInt(vehicle_id, 10));
      paramIndex++;
    }

    queryText += ` ORDER BY m.logged_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  /**
   * Find log by ID
   */
  static async findById(id) {
    const queryText = `SELECT * FROM maintenance_logs WHERE id = $1;`;
    const { rows } = await db.query(queryText, [id]);
    return rows[0] || null;
  }

  /**
   * Update maintenance log (triggers vehicle status recovery when Closed)
   */
  static async update(id, { description, cost, status, logged_at }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Maintenance record with ID ${id} not found.`);
      }

      const finalDescription = description !== undefined ? description.trim() : existing.description;
      const finalCost = cost !== undefined ? parseFloat(cost) : existing.cost;
      const finalStatus = status !== undefined ? status : existing.status;
      const finalLoggedAt = logged_at !== undefined ? logged_at : existing.logged_at;

      // Handle status change
      if (existing.status !== finalStatus) {
        const vehicle = await VehicleModel.findById(existing.vehicle_id);
        
        if (finalStatus === 'Closed') {
          // Closing restores vehicle to Available (unless retired)
          if (vehicle && vehicle.status !== 'Retired') {
            await client.query("UPDATE vehicles SET status = 'Available' WHERE id = $1;", [existing.vehicle_id]);
          }
        } else if (finalStatus === 'Active') {
          // Re-opening puts vehicle back In Shop
          if (vehicle && vehicle.status !== 'Retired') {
            await client.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1;", [existing.vehicle_id]);
          }
        }
      }

      const updateQuery = `
        UPDATE maintenance_logs
        SET description = $1, cost = $2, status = $3, logged_at = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *;
      `;
      const values = [finalDescription, finalCost, finalStatus, finalLoggedAt, id];
      const result = await client.query(updateQuery, values);
      const updatedLog = result.rows[0];

      await client.query('COMMIT');
      return updatedLog;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete maintenance record
   */
  static async delete(id) {
    const queryText = `DELETE FROM maintenance_logs WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(queryText, [id]);
    return rows.length > 0;
  }
}

module.exports = MaintenanceModel;
