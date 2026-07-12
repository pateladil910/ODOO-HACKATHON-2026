const VehicleModel = require('../models/vehicle.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getVehicles = asyncHandler(async (req, res) => {
  const { type, status, search } = req.query;
  const vehicles = await VehicleModel.findAll({ type, status, search });
  res.status(200).json(new ApiResponse(200, vehicles, 'Vehicles retrieved successfully.'));
});

const getVehicleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicle = await VehicleModel.findById(id);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, vehicle, 'Vehicle retrieved successfully.'));
});

const createVehicle = asyncHandler(async (req, res) => {
  const { registration_number, model, type, max_capacity, odometer, acquisition_cost, status } = req.body;

  if (!registration_number || !model || !type || max_capacity === undefined || odometer === undefined || acquisition_cost === undefined) {
    throw new ApiError(400, 'registration_number, model, type, max_capacity, odometer, and acquisition_cost are required.');
  }

  // Check unique registration
  const existing = await VehicleModel.findByRegistrationNumber(registration_number);
  if (existing) {
    throw new ApiError(409, `Vehicle with registration number ${registration_number} already exists.`);
  }

  const newVehicle = await VehicleModel.create({
    registration_number,
    model,
    type,
    max_capacity,
    odometer,
    acquisition_cost,
    status
  });

  res.status(201).json(new ApiResponse(201, newVehicle, 'Vehicle registered successfully.'));
});

const updateVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { model, type, max_capacity, odometer, acquisition_cost, status } = req.body;

  const updatedVehicle = await VehicleModel.update(id, {
    model,
    type,
    max_capacity,
    odometer,
    acquisition_cost,
    status
  });

  if (!updatedVehicle) {
    throw new ApiError(404, `Vehicle with ID ${id} not found.`);
  }

  res.status(200).json(new ApiResponse(200, updatedVehicle, 'Vehicle updated successfully.'));
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const success = await VehicleModel.delete(id);
  if (!success) {
    throw new ApiError(404, `Vehicle with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, null, 'Vehicle deleted successfully.'));
});

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
