const db = require('../config/db');

/**
 * Model representing Driver entity in TransitOps database
 */
class DriverModel {
  /**
   * Create a new driver record
   */
  static async create({ name, license_number, license_category, license_expiry_date, contact_number, safety_score = 100.00, status = 'Available' }) {
    const queryText = `
      INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      name.trim(),
      license_number.toUpperCase().trim(),
      license_category.trim(),
      license_expiry_date, // Date YYYY-MM-DD
      contact_number.trim(),
      parseFloat(safety_score),
      status
    ];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Find drivers with optional filters
   */
  static async findAll({ status, search } = {}) {
    let queryText = `SELECT * FROM drivers WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR license_number ILIKE $${paramIndex} OR contact_number ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  /**
   * Find driver by ID
   */
  static async findById(id) {
    const queryText = `SELECT * FROM drivers WHERE id = $1;`;
    const { rows } = await db.query(queryText, [id]);
    return rows[0] || null;
  }

  /**
   * Find driver by license number
   */
  static async findByLicenseNumber(licNum) {
    const queryText = `SELECT * FROM drivers WHERE license_number = $1;`;
    const { rows } = await db.query(queryText, [licNum.toUpperCase().trim()]);
    return rows[0] || null;
  }

  /**
   * Update driver record
   */
  static async update(id, { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status }) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const finalName = name !== undefined ? name.trim() : existing.name;
    const finalLicenseNumber = license_number !== undefined ? license_number.toUpperCase().trim() : existing.license_number;
    const finalLicenseCategory = license_category !== undefined ? license_category.trim() : existing.license_category;
    const finalLicenseExpiryDate = license_expiry_date !== undefined ? license_expiry_date : existing.license_expiry_date;
    const finalContactNumber = contact_number !== undefined ? contact_number.trim() : existing.contact_number;
    const finalSafetyScore = safety_score !== undefined ? parseFloat(safety_score) : existing.safety_score;
    const finalStatus = status !== undefined ? status : existing.status;

    const queryText = `
      UPDATE drivers
      SET name = $1, license_number = $2, license_category = $3, license_expiry_date = $4, contact_number = $5, safety_score = $6, status = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *;
    `;
    const values = [finalName, finalLicenseNumber, finalLicenseCategory, finalLicenseExpiryDate, finalContactNumber, finalSafetyScore, finalStatus, id];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Delete driver record
   */
  static async delete(id) {
    const queryText = `DELETE FROM drivers WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(queryText, [id]);
    return rows.length > 0;
  }

  /**
   * Find drivers with licenses expiring within 30 days or already expired (Reminders Bonus)
   */
  static async findExpiringLicenses() {
    const queryText = `
      SELECT id, name, license_number, license_expiry_date, contact_number, status,
             CASE 
               WHEN license_expiry_date < CURRENT_DATE THEN 'EXPIRED'
               ELSE 'EXPIRING_SOON'
             END as expiry_state,
             (license_expiry_date - CURRENT_DATE) as days_remaining
      FROM drivers
      WHERE license_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY license_expiry_date ASC;
    `;
    const { rows } = await db.query(queryText);
    return rows;
  }
}

module.exports = DriverModel;

