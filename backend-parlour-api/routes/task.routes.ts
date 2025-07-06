import { Router } from 'express';
import { createTask, getTasks, updateTask, deleteTask, updateTaskStatus } from '../controllers/task.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';

const router = Router();

// POST / → createTask (only super-admin)
router.post('/', 
  verifyToken, 
  allowRoles(['super-admin']), 
  createTask
);

// GET / → getTasks (all roles)
router.get('/', 
  verifyToken, 
  getTasks
);

// PUT /:id → updateTask (only super-admin)
router.put('/:id', 
  verifyToken, 
  allowRoles(['super-admin']), 
  updateTask
);

// DELETE /:id → deleteTask (only super-admin)
router.delete('/:id', 
  verifyToken, 
  allowRoles(['super-admin']), 
  deleteTask
);

// PATCH /:id/status → updateTaskStatus (all authenticated users)
router.patch('/:id/status',
  verifyToken,
  updateTaskStatus
);

export default router;
