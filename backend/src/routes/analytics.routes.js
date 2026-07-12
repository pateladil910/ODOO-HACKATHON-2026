const express = require('express');
const {
  getDashboardKPIs,
  getReports,
  exportReportsCSV
} = require('../controllers/analytics.controller');
const { verifyJWT, restrictTo } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/kpis', verifyJWT, getDashboardKPIs);
router.get('/reports', verifyJWT, restrictTo('financial_analyst', 'fleet_manager', 'admin'), getReports);
router.get('/export-csv', verifyJWT, restrictTo('financial_analyst', 'fleet_manager', 'admin'), exportReportsCSV);

module.exports = router;
