const express = require('express');
const {
  createFuelLog,
  getFuelLogs,
  createExpense,
  getExpenses,
  getOperationalCostSummary
} = require('../controllers/expense.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/fuel', verifyJWT, restrictTo('driver', 'financial_analyst', 'fleet_manager', 'admin'), createFuelLog);
router.get('/fuel', verifyJWT, restrictTo('financial_analyst', 'fleet_manager', 'admin'), getFuelLogs);

router.post('/other', verifyJWT, restrictTo('financial_analyst', 'fleet_manager', 'admin'), createExpense);
router.get('/other', verifyJWT, restrictTo('financial_analyst', 'fleet_manager', 'admin'), getExpenses);

router.get('/summary', verifyJWT, restrictTo('financial_analyst', 'fleet_manager', 'admin'), getOperationalCostSummary);

module.exports = router;
