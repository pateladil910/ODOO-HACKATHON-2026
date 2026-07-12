const express = require('express');
const healthRouter = require('./health.routes');
const placeholderRouter = require('./placeholder.routes');
const vehicleRouter = require('./vehicle.routes');
const driverRouter = require('./driver.routes');
const tripRouter = require('./trip.routes');
const maintenanceRouter = require('./maintenance.routes');
const expenseRouter = require('./expense.routes');
const analyticsRouter = require('./analytics.routes');

const router = express.Router();

// Mount sub-routers
router.use('/health', healthRouter);
router.use('/vehicles', vehicleRouter);
router.use('/drivers', driverRouter);
router.use('/trips', tripRouter);
router.use('/maintenance', maintenanceRouter);
router.use('/expenses', expenseRouter);
router.use('/analytics', analyticsRouter);
router.use('/', placeholderRouter); // Mount auth/items endpoints directly

module.exports = router;
