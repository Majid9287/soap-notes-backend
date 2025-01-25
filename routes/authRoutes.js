import express from 'express';
import { signup,signupWithOTP,verifySignupOTP,signinWithOTP,verifySigninOTP,resendOTP, getUserProfile,signin,verifyOTP, forgotPassword, resetPassword, refreshToken} from '../controllers/authController.js';
const router = express.Router();
import {protect} from '../middlewares/authMiddleware.js';
// Authentication Routes
// router.post('/signup', signup);
// router.post('/signin', signin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/verify-OTP', verifyOTP);
router.get('/profile',protect, getUserProfile);
// authRoutes.js
router.post('/signup', signupWithOTP);
router.post('/verify-signup', verifySignupOTP);
router.post('/signin', signinWithOTP);
router.post('/verify-signin', verifySigninOTP);
router.post('/resend-otp', resendOTP);


export default router;
