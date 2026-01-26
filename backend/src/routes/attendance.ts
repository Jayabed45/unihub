import { Router } from 'express';
import { markSelfAttendance, getProjectAttendanceForDate } from '../controllers/attendanceController';

const router = Router();

// Participant marks their own attendance for today
router.post('/self', markSelfAttendance);

// Leader/Admin fetches attendance for a project for a given day (defaults to today)
router.get('/project', getProjectAttendanceForDate);

export default router;
