import TrackingService from '../services/trackingService.js';
import logger from '../utils/logger.js';

class AnalyticsController {
    async getUserActivity(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const analytics = await TrackingService.getActivityAnalytics(
                req.user.userId,
                new Date(startDate),
                new Date(endDate)
            );
            res.json(analytics);
        } catch (error) {
            logger.error('Error in getUserActivity:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getSecurityLogs(req, res) {
        try {
            const { startDate, endDate, severity } = req.query;
            const logs = await TrackingService.getSecurityLogs(
                req.user.userId,
                new Date(startDate),
                new Date(endDate),
                severity
            );
            res.json(logs);
        } catch (error) {
            logger.error('Error in getSecurityLogs:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

export default new AnalyticsController();

