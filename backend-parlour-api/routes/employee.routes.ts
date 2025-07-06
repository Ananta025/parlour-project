import { Router } from 'express';
import { createEmployee, getEmployees, updateEmployee, deleteEmployee } from '../controllers/employee.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { allowRoles } from '../middlewares/role.middleware.js';

const router = Router();

// POST / → createEmployee (only super-admin)
router.post('/', 
  verifyToken, 
  allowRoles(['super-admin']), 
  createEmployee
);

// GET / → getEmployees (admin + super-admin)
router.get('/', 
  verifyToken, 
  allowRoles(['super-admin', 'admin']), 
  getEmployees
);

// PUT /:id → updateEmployee (only super-admin)
router.put('/:id', 
  verifyToken, 
  allowRoles(['super-admin']), 
  updateEmployee
);

// DELETE /:id → deleteEmployee (only super-admin)
router.delete('/:id', 
  verifyToken, 
  allowRoles(['super-admin']), 
  deleteEmployee
);

export default router;
