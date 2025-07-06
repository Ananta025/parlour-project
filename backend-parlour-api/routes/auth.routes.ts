// Login route: verifies email/password and returns JWT token
import express, { Request, Response, NextFunction } from 'express';
import { loginUser } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  loginUser(req, res).catch(next);
});

export default router;
