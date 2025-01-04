import express from 'express';
import { createPaymentIntent, confirmPayment, getPackageDetails } from '../controllers/paymentController.js';
import {protect} from '../middlewares/authMiddleware.js';
const router = express.Router();

// Route to create a payment intent
router.post('/create-payment-intent', protect, createPaymentIntent);

// Route to confirm a payment
router.post('/confirm-payment', protect, confirmPayment);

export default router;

