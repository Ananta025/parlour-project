import { Router } from 'express';
import { 
  createAttendance, 
  getAttendanceLogs, 
  getAggregatedAttendance,
  updateAttendance,
  deleteAttendance
} from '../controllers/attendance.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';

const router = Router();

// Existing routes
router.get('/', verifyToken, getAttendanceLogs);
router.post('/', verifyToken, createAttendance);

// New routes for aggregated attendance data
router.get('/daily', verifyToken, getAggregatedAttendance);

// SuperAdmin only routes for editing and deleting attendance
router.put('/:id', verifyToken, allowRoles(['super-admin']), updateAttendance);
router.delete('/:id', verifyToken, allowRoles(['super-admin']), deleteAttendance);

export default router;

