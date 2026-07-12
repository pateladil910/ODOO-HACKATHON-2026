const express = require('express');
const { 
  getVehicles, 
  getVehicleById, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle 
} = require('../controllers/vehicle.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyJWT, getVehicles);
router.get('/:id', verifyJWT, getVehicleById);
router.post('/', verifyJWT, restrictTo('fleet_manager', 'admin'), createVehicle);
router.put('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), updateVehicle);
router.delete('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), deleteVehicle);

module.exports = router;
