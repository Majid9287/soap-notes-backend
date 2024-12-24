import express from 'express';
import AnalyticsController from '../controllers/analyticsController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/user-activity', AnalyticsController.getUserActivity);
router.get('/security-logs', AnalyticsController.getSecurityLogs);

export default router;

