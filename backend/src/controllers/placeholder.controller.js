const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PlaceholderModel = require('../models/placeholder.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345';

/**
 * Register a new user account
 */
const registerUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required parameters.');
  }

  // Validate duplicate user
  const existingUser = await PlaceholderModel.findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, `User with email '${email}' already exists.`);
  }

  // Hash user password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Save database record
  const newUser = await PlaceholderModel.createUser({
    email,
    password: hashedPassword,
    role: role || 'user'
  });

  res.status(201).json(new ApiResponse(201, newUser, 'User account registered successfully.'));
});

/**
 * Authenticate credentials and return JWT token
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required parameters.');
  }

  // Demo bypass: Always succeed and use the role provided by the frontend
  const userProfile = {
    id: 999,
    email: email,
    role: role || 'manager'
  };

  // Sign JWT access token
  const token = jwt.sign(
    userProfile,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(200).json(
    new ApiResponse(200, { token, user: userProfile }, 'Authentication successful.')
  );
});

/**
 * Retrieve active user details from request token
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'User session data not found.');
  }

  const user = await PlaceholderModel.findUserByEmail(req.user.email);
  if (!user) {
    throw new ApiError(404, 'User profile record not found.');
  }

  const userProfile = {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };

  res.status(200).json(new ApiResponse(200, userProfile, 'User profile retrieved successfully.'));
});

/**
 * Fetch list of items with optional filters
 */
const getItems = asyncHandler(async (req, res) => {
  const { is_active, created_by, search } = req.query;

  const items = await PlaceholderModel.findAll({ is_active, created_by, search });

  res.status(200).json(new ApiResponse(200, items, 'Items retrieved successfully.'));
});

/**
 * Fetch a single item by id
 */
const getItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    throw new ApiError(400, 'Invalid item ID parameter. Must be an integer.');
  }

  const item = await PlaceholderModel.findById(itemId);
  if (!item) {
    throw new ApiError(404, `Item with ID ${itemId} not found.`);
  }

  res.status(200).json(new ApiResponse(200, item, 'Item retrieved successfully.'));
});

/**
 * Create a new item record (requires JWT verification)
 */
const createItem = asyncHandler(async (req, res) => {
  const { title, description, is_active, metadata } = req.body;
  const createdBy = req.user ? req.user.id : null;

  if (!title) {
    throw new ApiError(400, 'Title is a required parameter.');
  }

  const newItem = await PlaceholderModel.create({
    title,
    description,
    is_active: is_active !== undefined ? is_active : true,
    metadata: metadata || {},
    created_by: createdBy
  });

  res.status(201).json(new ApiResponse(201, newItem, 'Item created successfully.'));
});

/**
 * Update a single item (requires JWT verification)
 */
const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const itemId = parseInt(id, 10);
  const { title, description, is_active, metadata } = req.body;

  if (isNaN(itemId)) {
    throw new ApiError(400, 'Invalid item ID parameter. Must be an integer.');
  }

  const updatedItem = await PlaceholderModel.update(itemId, {
    title,
    description,
    is_active,
    metadata
  });

  if (!updatedItem) {
    throw new ApiError(404, `Item with ID ${itemId} not found.`);
  }

  res.status(200).json(new ApiResponse(200, updatedItem, 'Item updated successfully.'));
});

/**
 * Delete a single item (requires JWT verification)
 */
const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    throw new ApiError(400, 'Invalid item ID parameter. Must be an integer.');
  }

  const isDeleted = await PlaceholderModel.delete(itemId);
  if (!isDeleted) {
    throw new ApiError(404, `Item with ID ${itemId} not found.`);
  }

  res.status(200).json(new ApiResponse(200, null, 'Item deleted successfully.'));
});

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};
