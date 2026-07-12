const express = require('express');
const {
  getMaintenanceLogs,
  getMaintenanceLogById,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog
} = require('../controllers/maintenance.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyJWT, getMaintenanceLogs);
router.get('/:id', verifyJWT, getMaintenanceLogById);
router.post('/', verifyJWT, restrictTo('fleet_manager', 'admin'), createMaintenanceLog);
router.put('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), updateMaintenanceLog);
router.delete('/:id', verifyJWT, restrictTo('admin'), deleteMaintenanceLog);

module.exports = router;
