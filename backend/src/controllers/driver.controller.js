const DriverModel = require('../models/driver.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getDrivers = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const drivers = await DriverModel.findAll({ status, search });
  res.status(200).json(new ApiResponse(200, drivers, 'Drivers retrieved successfully.'));
});

const getDriverById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const driver = await DriverModel.findById(id);
  if (!driver) {
    throw new ApiError(404, `Driver with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, driver, 'Driver retrieved successfully.'));
});

const createDriver = asyncHandler(async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;

  if (!name || !license_number || !license_category || !license_expiry_date || !contact_number) {
    throw new ApiError(400, 'name, license_number, license_category, license_expiry_date, and contact_number are required.');
  }

  // Check unique license number
  const existing = await DriverModel.findByLicenseNumber(license_number);
  if (existing) {
    throw new ApiError(409, `Driver with license number ${license_number} already exists.`);
  }

  const newDriver = await DriverModel.create({
    name,
    license_number,
    license_category,
    license_expiry_date,
    contact_number,
    safety_score,
    status
  });

  res.status(201).json(new ApiResponse(201, newDriver, 'Driver registered successfully.'));
});

const updateDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;

  const updatedDriver = await DriverModel.update(id, {
    name,
    license_number,
    license_category,
    license_expiry_date,
    contact_number,
    safety_score,
    status
  });

  if (!updatedDriver) {
    throw new ApiError(404, `Driver with ID ${id} not found.`);
  }

  res.status(200).json(new ApiResponse(200, updatedDriver, 'Driver updated successfully.'));
});

const deleteDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const success = await DriverModel.delete(id);
  if (!success) {
    throw new ApiError(404, `Driver with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, null, 'Driver deleted successfully.'));
});

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver
};
