const db = require('../config/db');
const VehicleModel = require('./vehicle.model');
const DriverModel = require('./driver.model');

/**
 * Model representing Trip entity in TransitOps database with Transactional State Management
 */
class TripModel {
  /**
   * Create a new trip record (enforces business validations via transaction)
   */
  static async create({ source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status = 'Draft', revenue = 0.00 }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch vehicle & validate
      const vehicle = await VehicleModel.findById(vehicle_id);
      if (!vehicle) {
        throw new Error(`Vehicle with ID ${vehicle_id} not found.`);
      }
      if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
        throw new Error(`Vehicle ${vehicle.registration_number} is in status '${vehicle.status}' and cannot be dispatched.`);
      }
      if (parseFloat(cargo_weight) > parseFloat(vehicle.max_capacity)) {
        throw new Error(`Cargo weight (${cargo_weight} kg) exceeds vehicle maximum capacity (${vehicle.max_capacity} kg).`);
      }

      // 2. Fetch driver & validate
      const driver = await DriverModel.findById(driver_id);
      if (!driver) {
        throw new Error(`Driver with ID ${driver_id} not found.`);
      }
      if (driver.status === 'Suspended') {
        throw new Error(`Driver ${driver.name} is Suspended and cannot be assigned to trips.`);
      }
      
      const today = new Date();
      const licenseExpiry = new Date(driver.license_expiry_date);
      if (licenseExpiry < today) {
        throw new Error(`Driver ${driver.name} has an expired driving license (Expired: ${driver.license_expiry_date}) and cannot be assigned.`);
      }

      // 3. Check duplicate assignment if dispatching
      if (status === 'Dispatched') {
        if (vehicle.status === 'On Trip') {
          throw new Error(`Vehicle ${vehicle.registration_number} is already on an active trip.`);
        }
        if (driver.status === 'On Trip') {
          throw new Error(`Driver ${driver.name} is already on an active trip.`);
        }
      }

      // 4. Create Trip
      const insertQuery = `
        INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, revenue)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const tripValues = [
        source.trim(),
        destination.trim(),
        vehicle_id,
        driver_id,
        parseFloat(cargo_weight),
        parseFloat(planned_distance),
        status,
        parseFloat(revenue)
      ];
      const tripResult = await client.query(insertQuery, tripValues);
      const newTrip = tripResult.rows[0];

      // 5. If dispatching immediately, lock vehicle and driver status to On Trip
      if (status === 'Dispatched') {
        await client.query("UPDATE vehicles SET status = 'On Trip' WHERE id = $1;", [vehicle_id]);
        await client.query("UPDATE drivers SET status = 'On Trip' WHERE id = $1;", [driver_id]);
      }

      await client.query('COMMIT');
      return newTrip;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find trips with filters
   */
  static async findAll({ status, vehicle_id, driver_id, search } = {}) {
    let queryText = `
      SELECT t.*, 
             v.registration_number as vehicle_registration, v.model as vehicle_model,
             d.name as driver_name, d.license_number as driver_license
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (vehicle_id) {
      queryText += ` AND t.vehicle_id = $${paramIndex}`;
      values.push(parseInt(vehicle_id, 10));
      paramIndex++;
    }

    if (driver_id) {
      queryText += ` AND t.driver_id = $${paramIndex}`;
      values.push(parseInt(driver_id, 10));
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (t.source ILIKE $${paramIndex} OR t.destination ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  /**
   * Find trip by ID
   */
  static async findById(id) {
    const queryText = `
      SELECT t.*, 
             v.registration_number as vehicle_registration, v.model as vehicle_model,
             d.name as driver_name, d.license_number as driver_license
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE t.id = $1;
    `;
    const { rows } = await db.query(queryText, [id]);
    return rows[0] || null;
  }

  /**
   * Update trip record and sync vehicle/driver statuses depending on state changes
   */
  static async update(id, updates) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Trip with ID ${id} not found.`);
      }

      const finalStatus = updates.status !== undefined ? updates.status : existing.status;
      const finalRevenue = updates.revenue !== undefined ? parseFloat(updates.revenue) : parseFloat(existing.revenue);
      const finalSource = updates.source !== undefined ? updates.source.trim() : existing.source;
      const finalDestination = updates.destination !== undefined ? updates.destination.trim() : existing.destination;
      const finalPlannedDistance = updates.planned_distance !== undefined ? parseFloat(updates.planned_distance) : parseFloat(existing.planned_distance);
      const finalCargoWeight = updates.cargo_weight !== undefined ? parseFloat(updates.cargo_weight) : parseFloat(existing.cargo_weight);

      // Validate capacity constraints if cargo weight changes
      if (updates.cargo_weight !== undefined) {
        const vehicle = await VehicleModel.findById(existing.vehicle_id);
        if (parseFloat(updates.cargo_weight) > parseFloat(vehicle.max_capacity)) {
          throw new Error(`Cargo weight (${updates.cargo_weight} kg) exceeds vehicle max capacity (${vehicle.max_capacity} kg).`);
        }
      }

      // Enforce status transitions
      if (existing.status !== finalStatus) {
        // --- 1. Transitioning to Dispatched ---
        if (finalStatus === 'Dispatched') {
          // Check vehicle/driver statuses before dispatching
          const vehicle = await VehicleModel.findById(existing.vehicle_id);
          const driver = await DriverModel.findById(existing.driver_id);
          
          if (vehicle.status === 'On Trip') {
            throw new Error(`Vehicle ${vehicle.registration_number} is already on an active trip.`);
          }
          if (driver.status === 'On Trip') {
            throw new Error(`Driver ${driver.name} is already on an active trip.`);
          }
          if (vehicle.status === 'In Shop' || vehicle.status === 'Retired') {
            throw new Error(`Vehicle ${vehicle.registration_number} is in status '${vehicle.status}' and cannot be dispatched.`);
          }
          if (driver.status === 'Suspended') {
            throw new Error(`Driver ${driver.name} is Suspended and cannot be assigned.`);
          }

          // Lock vehicle/driver
          await client.query("UPDATE vehicles SET status = 'On Trip' WHERE id = $1;", [existing.vehicle_id]);
          await client.query("UPDATE drivers SET status = 'On Trip' WHERE id = $1;", [existing.driver_id]);
        }

        // --- 2. Transitioning to Completed or Cancelled from Dispatched ---
        if (existing.status === 'Dispatched' && (finalStatus === 'Completed' || finalStatus === 'Cancelled')) {
          // Unlock vehicle/driver back to Available
          await client.query("UPDATE vehicles SET status = 'Available' WHERE id = $1;", [existing.vehicle_id]);
          await client.query("UPDATE drivers SET status = 'Available' WHERE id = $1;", [existing.driver_id]);
        }
      }

      // Perform update query
      const updateQuery = `
        UPDATE trips
        SET source = $1, destination = $2, cargo_weight = $3, planned_distance = $4, status = $5, revenue = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *;
      `;
      const values = [finalSource, finalDestination, finalCargoWeight, finalPlannedDistance, finalStatus, finalRevenue, id];
      const result = await client.query(updateQuery, values);
      const updatedTrip = result.rows[0];

      await client.query('COMMIT');
      return updatedTrip;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete trip record
   */
  static async delete(id) {
    const queryText = `DELETE FROM trips WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(queryText, [id]);
    return rows.length > 0;
  }
}

module.exports = TripModel;
