const db = require('../config/db');

/**
 * Generic Model interacting with PostgreSQL Database for Item operations
 */
class PlaceholderModel {
  /**
   * Create a new item
   * @param {Object} itemData - Item attributes
   * @returns {Promise<Object>} The created item record
   */
  static async create({ title, description, is_active = true, metadata = {}, created_by = null }) {
    const queryText = `
      INSERT INTO items (title, description, is_active, metadata, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [title, description, is_active, JSON.stringify(metadata), created_by];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Find all items with optional filters (pagination/search/activity filters)
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} List of items
   */
  static async findAll({ is_active, created_by, search } = {}) {
    let queryText = `
      SELECT i.*, u.email as creator_email 
      FROM items i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      queryText += ` AND i.is_active = $${paramIndex}`;
      values.push(is_active === 'true' || is_active === true);
      paramIndex++;
    }

    if (created_by !== undefined) {
      queryText += ` AND i.created_by = $${paramIndex}`;
      values.push(parseInt(created_by, 10));
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (i.title ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY i.created_at DESC`;

    const { rows } = await db.query(queryText, values);
    return rows;
  }

  /**
   * Find a single item by its ID
   * @param {number} id - Item primary key ID
   * @returns {Promise<Object|null>} The item details or null
   */
  static async findById(id) {
    const queryText = `
      SELECT i.*, u.email as creator_email 
      FROM items i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = $1;
    `;
    const { rows } = await db.query(queryText, [id]);
    return rows[0] || null;
  }

  /**
   * Update an item record partially
   * @param {number} id - Item primary key ID
   * @param {Object} updateData - Updated parameters
   * @returns {Promise<Object|null>} Updated item details or null
   */
  static async update(id, { title, description, is_active, metadata }) {
    // Check if the item exists first
    const existing = await this.findById(id);
    if (!existing) return null;

    // Use current values as fallbacks for partial updates
    const finalTitle = title !== undefined ? title : existing.title;
    const finalDescription = description !== undefined ? description : existing.description;
    const finalIsActive = is_active !== undefined ? (is_active === 'true' || is_active === true) : existing.is_active;
    const finalMetadata = metadata !== undefined ? JSON.stringify(metadata) : existing.metadata;

    const queryText = `
      UPDATE items
      SET title = $1, description = $2, is_active = $3, metadata = $4
      WHERE id = $5
      RETURNING *;
    `;
    const values = [finalTitle, finalDescription, finalIsActive, finalMetadata, id];
    const { rows } = await db.query(queryText, values);
    return rows[0];
  }

  /**
   * Delete an item record by ID
   * @param {number} id - Item primary key ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const queryText = 'DELETE FROM items WHERE id = $1 RETURNING id;';
    const { rows } = await db.query(queryText, [id]);
    return rows.length > 0;
  }

  /**
   * Find a user by their email address (Auth Helper)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findUserByEmail(email) {
    const queryText = 'SELECT * FROM users WHERE email = $1;';
    const { rows } = await db.query(queryText, [email]);
    return rows[0] || null;
  }

  /**
   * Create a new user account (Auth Helper)
   * @param {Object} userData - User account attributes
   * @returns {Promise<Object>} Created user record
   */
  static async createUser({ email, password, role = 'user' }) {
    const queryText = `
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role, created_at;
    `;
    const { rows } = await db.query(queryText, [email, password, role]);
    return rows[0];
  }
}

module.exports = PlaceholderModel;
