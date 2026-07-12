const express = require('express');
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver
} = require('../controllers/driver.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyJWT, getDrivers);
router.get('/:id', verifyJWT, getDriverById);
router.post('/', verifyJWT, restrictTo('safety_officer', 'fleet_manager', 'admin'), createDriver);
router.put('/:id', verifyJWT, restrictTo('safety_officer', 'fleet_manager', 'admin'), updateDriver);
router.delete('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), deleteDriver);

module.exports = router;
