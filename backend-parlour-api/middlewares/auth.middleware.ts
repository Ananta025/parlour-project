import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types/index.js';

// JWT auth middleware
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    // Check if header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }
    
    // Extract the token (remove 'Bearer ' prefix)
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    ) as UserPayload;
    
    // Attach user info to request object
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication failed.'
    });
  }
};
