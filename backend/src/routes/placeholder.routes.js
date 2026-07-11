const express = require('express');
const {
  registerUser,
  loginUser,
  getCurrentUser,
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/placeholder.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

// --- Authentication Endpoints ---
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/me', verifyJWT, getCurrentUser);

// --- CRUD Endpoints for Generic Items ---
// Retrieve all items & retrieve single item (Public actions)
router.get('/items', getItems);
router.get('/items/:id', getItemById);

// Create item (Authenticated user action)
router.post('/items', verifyJWT, createItem);

// Update item (Authenticated user action)
router.put('/items/:id', verifyJWT, updateItem);

// Delete item (Admin-only action to demonstrate authorization restriction)
router.delete('/items/:id', verifyJWT, restrictTo('admin'), deleteItem);

module.exports = router;
