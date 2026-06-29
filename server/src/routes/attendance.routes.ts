import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Student: view own attendance
router.get('/my', requirePermission('VIEW_OWN_ATTENDANCE'), attendanceController.getMyAttendance.bind(attendanceController));

// Student/All: stats
router.get('/stats', requirePermission('VIEW_OWN_ATTENDANCE'), attendanceController.getStats.bind(attendanceController));

// Committee+: view all attendance
router.get('/', requirePermission('VIEW_ALL_ATTENDANCE'), attendanceController.getAllAttendance.bind(attendanceController));

// Committee+: get students list for a schedule (for marking UI)
router.get('/schedule/:scheduleId/students', requirePermission('MARK_ATTENDANCE'), attendanceController.getStudentsForSchedule.bind(attendanceController));

// Committee+: mark single student
router.post('/mark', requirePermission('MARK_ATTENDANCE'), attendanceController.markAttendance.bind(attendanceController));

// Committee+: mark multiple students at once (ACID bulk transaction)
router.post('/mark-bulk', requirePermission('MARK_ATTENDANCE'), attendanceController.markBulkAttendance.bind(attendanceController));

export default router;
