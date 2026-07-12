const ExpenseModel = require('../models/expense.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// --- Fuel Log Handlers ---
const createFuelLog = asyncHandler(async (req, res) => {
  const { vehicle_id, liters, cost, logged_at } = req.body;

  if (vehicle_id === undefined || liters === undefined || cost === undefined) {
    throw new ApiError(400, 'vehicle_id, liters, and cost are required fields.');
  }

  const newLog = await ExpenseModel.createFuelLog({
    vehicle_id,
    liters,
    cost,
    logged_at
  });
  res.status(201).json(new ApiResponse(201, newLog, 'Fuel purchase logged successfully.'));
});

const getFuelLogs = asyncHandler(async (req, res) => {
  const { vehicle_id } = req.query;
  const logs = await ExpenseModel.getFuelLogs({ vehicle_id });
  res.status(200).json(new ApiResponse(200, logs, 'Fuel logs retrieved successfully.'));
});

// --- Other Expense Handlers ---
const createExpense = asyncHandler(async (req, res) => {
  const { vehicle_id, type, cost, logged_at } = req.body;

  if (vehicle_id === undefined || !type || cost === undefined) {
    throw new ApiError(400, 'vehicle_id, type, and cost are required fields.');
  }

  const newExpense = await ExpenseModel.createExpense({
    vehicle_id,
    type,
    cost,
    logged_at
  });
  res.status(201).json(new ApiResponse(201, newExpense, 'Operating expense logged successfully.'));
});

const getExpenses = asyncHandler(async (req, res) => {
  const { vehicle_id } = req.query;
  const expenses = await ExpenseModel.getExpenses({ vehicle_id });
  res.status(200).json(new ApiResponse(200, expenses, 'Operating expenses retrieved successfully.'));
});

// --- Summary Handler ---
const getOperationalCostSummary = asyncHandler(async (req, res) => {
  const { vehicle_id } = req.query;
  const summary = await ExpenseModel.getOperationalCostsSummary(vehicle_id);
  res.status(200).json(new ApiResponse(200, summary, 'Operational costs summary retrieved successfully.'));
});

module.exports = {
  createFuelLog,
  getFuelLogs,
  createExpense,
  getExpenses,
  getOperationalCostSummary
};
