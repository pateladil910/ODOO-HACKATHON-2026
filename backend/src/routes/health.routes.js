const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * @route GET /api/v1/health
 * @desc Get backend server and database connectivity health status
 * @access Public
 */
router.get('/', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    database: 'UNKNOWN'
  };

  try {
    // Perform simple query to verify database check
    await db.query('SELECT 1');
    healthcheck.database = 'CONNECTED';
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    healthcheck.database = 'DISCONNECTED';
    res.status(503).json(healthcheck); // Service Unavailable
  }
});

module.exports = router;
