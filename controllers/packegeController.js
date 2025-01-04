import Package from '../models/Package.js';
import { createOne, getOne, getAll, updateOne, deleteOne } from '../factory/handleFactory.js';

import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { sendSuccessResponse } from '../utils/responseHandler.js';

// Use the factory functions for CRUD operations
export const createPackage = createOne(Package);
export const getPackage = getOne(Package);
export const getAllPackages = getAll(Package);
export const updatePackage = updateOne(Package);
export const deletePackage = deleteOne(Package);

// Custom controller for getting yearly price
export const getYearlyPrice = catchAsync(async (req, res, next) => {
  const userpackage = await Package.findById(req.params.id);

  if (!userpackage) {
    throw new AppError('No userpackage found with that ID', 404);
  }

  const yearlyPrice = userpackage.calculateYearlyPrice();

  sendSuccessResponse(res, { yearlyPrice }, 'Yearly price calculated successfully');
});

// Custom controller for getting active packages
export const getActivePackages = catchAsync(async (req, res, next) => {
  const activePackages = await Package.find({ isActive: true });

  sendSuccessResponse(res, { results: activePackages.length, doc: activePackages }, 'Active packages retrieved successfully');
});

// Custom controller for toggling userpackage active status
export const togglePackageStatus = catchAsync(async (req, res, next) => {
  const userpackage = await Package.findById(req.params.id);

  if (!userpackage) {
    throw new AppError('No userpackage found with that ID', 404);
  }

  userpackage.isActive = !userpackage.isActive;
  await userpackage.save();

  sendSuccessResponse(res, { doc: userpackage }, `Package status updated to ${userpackage.isActive ? 'active' : 'inactive'}`);
});

