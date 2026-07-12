const MaintenanceModel = require('../models/maintenance.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getMaintenanceLogs = asyncHandler(async (req, res) => {
  const { status, vehicle_id } = req.query;
  const logs = await MaintenanceModel.findAll({ status, vehicle_id });
  res.status(200).json(new ApiResponse(200, logs, 'Maintenance records retrieved successfully.'));
});

const getMaintenanceLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const log = await MaintenanceModel.findById(id);
  if (!log) {
    throw new ApiError(404, `Maintenance record with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, log, 'Maintenance record retrieved successfully.'));
});

const createMaintenanceLog = asyncHandler(async (req, res) => {
  const { vehicle_id, description, cost, status, logged_at } = req.body;

  if (vehicle_id === undefined || !description || cost === undefined) {
    throw new ApiError(400, 'vehicle_id, description, and cost are required fields.');
  }

  try {
    const newLog = await MaintenanceModel.create({
      vehicle_id,
      description,
      cost,
      status,
      logged_at
    });
    res.status(201).json(new ApiResponse(201, newLog, 'Maintenance record logged successfully.'));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const updateMaintenanceLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { description, cost, status, logged_at } = req.body;

  try {
    const updatedLog = await MaintenanceModel.update(id, {
      description,
      cost,
      status,
      logged_at
    });
    res.status(200).json(new ApiResponse(200, updatedLog, 'Maintenance record updated successfully.'));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const deleteMaintenanceLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const success = await MaintenanceModel.delete(id);
  if (!success) {
    throw new ApiError(404, `Maintenance record with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, null, 'Maintenance record deleted successfully.'));
});

module.exports = {
  getMaintenanceLogs,
  getMaintenanceLogById,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog
};
