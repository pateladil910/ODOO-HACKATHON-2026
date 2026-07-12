const express = require('express');
const {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
} = require('../controllers/trip.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyJWT, getTrips);
router.get('/:id', verifyJWT, getTripById);
router.post('/', verifyJWT, restrictTo('fleet_manager', 'admin'), createTrip);
router.put('/:id', verifyJWT, restrictTo('driver', 'fleet_manager', 'admin'), updateTrip);
router.delete('/:id', verifyJWT, restrictTo('fleet_manager', 'admin'), deleteTrip);

module.exports = router;
