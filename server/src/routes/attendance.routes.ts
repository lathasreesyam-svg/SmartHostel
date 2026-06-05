import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/my', attendanceController.getMyAttendance.bind(attendanceController));
router.get('/stats', attendanceController.getStats.bind(attendanceController));
router.get('/all', authorize('COMMITTEE', 'ADMIN', 'WARDEN'), attendanceController.getAllAttendance.bind(attendanceController));
router.post('/qr/generate', authorize('STUDENT'), attendanceController.generateQR.bind(attendanceController));
router.post('/qr/scan', authorize('COMMITTEE', 'ADMIN'), attendanceController.scanQR.bind(attendanceController));

export default router;
