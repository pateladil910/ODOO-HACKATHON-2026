const TripModel = require('../models/trip.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getTrips = asyncHandler(async (req, res) => {
  const { status, vehicle_id, driver_id, search } = req.query;
  const trips = await TripModel.findAll({ status, vehicle_id, driver_id, search });
  res.status(200).json(new ApiResponse(200, trips, 'Trips retrieved successfully.'));
});

const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trip = await TripModel.findById(id);
  if (!trip) {
    throw new ApiError(404, `Trip with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, trip, 'Trip retrieved successfully.'));
});

const createTrip = asyncHandler(async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, revenue } = req.body;

  if (!source || !destination || vehicle_id === undefined || driver_id === undefined || cargo_weight === undefined || planned_distance === undefined) {
    throw new ApiError(400, 'source, destination, vehicle_id, driver_id, cargo_weight, and planned_distance are required fields.');
  }

  try {
    const newTrip = await TripModel.create({
      source,
      destination,
      vehicle_id,
      driver_id,
      cargo_weight,
      planned_distance,
      status,
      revenue
    });
    res.status(201).json(new ApiResponse(201, newTrip, 'Trip created successfully.'));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { source, destination, cargo_weight, planned_distance, status, revenue } = req.body;

  try {
    const updatedTrip = await TripModel.update(id, {
      source,
      destination,
      cargo_weight,
      planned_distance,
      status,
      revenue
    });
    res.status(200).json(new ApiResponse(200, updatedTrip, 'Trip updated successfully.'));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const deleteTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const success = await TripModel.delete(id);
  if (!success) {
    throw new ApiError(404, `Trip with ID ${id} not found.`);
  }
  res.status(200).json(new ApiResponse(200, null, 'Trip deleted successfully.'));
});

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
};
