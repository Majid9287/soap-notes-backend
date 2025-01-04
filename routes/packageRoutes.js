import express from 'express';
import * as packageController from '../controllers/packegeController.js';
// import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// // Protect all routes after this middleware
// router.use(protect);

// // Restrict all routes after this middleware to admin only
// router.use(restrictTo('admin'));

router.route('/').get(packageController.getAllPackages)
//   .post(packageController.createPackage);

// router.get('/active', packageController.getActivePackages);

router.route('/:id').get(packageController.getPackage)
//   .patch(packageController.updatePackage)
//   .delete(packageController.deletePackage);

// router.get('/:id/yearly-price', packageController.getYearlyPrice);
// router.patch('/:id/toggle-status', packageController.togglePackageStatus);

export default router;

