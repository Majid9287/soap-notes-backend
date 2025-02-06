import express from 'express';
import {logout, requestPasswordReset,signupWithOTP,verifySignupOTP,signinWithOTP,verifySigninOTP,resendOTP, getUserProfile, resetPassword, refreshToken} from '../controllers/authController.js';
const router = express.Router();
import {protect} from '../middlewares/authMiddleware.js';
import logger from '../middlewares/logger.js';

router.use(logger);
router.post('/logout', protect, logout);
router.post('/request-reset', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);
router.post('/refresh-token', refreshToken);
router.get('/profile',protect, getUserProfile);
// authRoutes.js
router.post('/signup', signupWithOTP);
router.post('/verify-signup',verifySignupOTP);
router.post('/signin', signinWithOTP);
router.post('/verify-signin', verifySigninOTP);
router.post('/resend-otp', resendOTP);


export default router;
