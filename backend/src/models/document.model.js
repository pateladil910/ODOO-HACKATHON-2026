const db = require('../config/db');

class DocumentModel {
  /**
   * Safe initialization to prevent failures if DB setup was already run before the migration
   */
  static async createTableIfNotExists() {
    const queryText = `
      CREATE TABLE IF NOT EXISTS vehicle_documents (
        id SERIAL PRIMARY KEY,
        vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        file_type VARCHAR(100),
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    try {
      await db.query(queryText);
    } catch (e) {
      console.error('[DocumentModel] Error creating table:', e.message);
    }
  }

  /**
   * Add a new document reference
   */
  static async create({ vehicle_id, document_name, file_path, file_type }) {
    await this.createTableIfNotExists();
    const queryText = `
      INSERT INTO vehicle_documents (vehicle_id, document_name, file_path, file_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [parseInt(vehicle_id, 10), document_name.trim(), file_path, file_type];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Retrieve list of documents for a specific vehicle
   */
  static async findByVehicleId(vehicleId) {
    await this.createTableIfNotExists();
    const queryText = `SELECT * FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY uploaded_at DESC;`;
    const { rows } = await db.query(queryText, [parseInt(vehicleId, 10)]);
    return rows;
  }

  /**
   * Find single document details
   */
  static async findById(id) {
    await this.createTableIfNotExists();
    const queryText = `SELECT * FROM vehicle_documents WHERE id = $1;`;
    const { rows } = await db.query(queryText, [parseInt(id, 10)]);
    return rows[0] || null;
  }

  /**
   * Delete a document reference
   */
  static async delete(id) {
    await this.createTableIfNotExists();
    const queryText = `DELETE FROM vehicle_documents WHERE id = $1 RETURNING id;`;
    const { rows } = await db.query(queryText, [parseInt(id, 10)]);
    return rows.length > 0;
  }
}

module.exports = DocumentModel;
