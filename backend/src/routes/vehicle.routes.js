const express = require('express');
const { 
  getVehicles, 
  getVehicleById, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle 
} = require('../controllers/vehicle.controller');
const {
  uploadDocument,
  getVehicleDocuments,
  downloadDocument,
  deleteDocument
} = require('../controllers/document.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyJWT, getVehicles);
router.get('/:id', verifyJWT, getVehicleById);
router.post('/', verifyJWT, restrictTo('fleet_manager', 'admin'), createVehicle);
router.put('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), updateVehicle);
router.delete('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), deleteVehicle);

// --- Vehicle Document Management Bonus Feature Endpoints ---
router.get('/:id/documents', verifyJWT, getVehicleDocuments);
router.post('/:id/documents', verifyJWT, restrictTo('fleet_manager', 'admin'), uploadDocument);
router.get('/documents/:docId', verifyJWT, downloadDocument);
router.delete('/documents/:docId', verifyJWT, restrictTo('fleet_manager', 'admin'), deleteDocument);

module.exports = router;

