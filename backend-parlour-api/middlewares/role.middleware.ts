import { Request, Response, NextFunction } from 'express';

// Role-based access control middleware
export const allowRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        res.status(403).json({
          success: false,
          message: 'Access denied. User role not found.'
        });
        return;
      }
      
      // Check if the user's role is allowed
      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(' or ')}.`
        });
        return;
      }
      
      // Role is allowed, proceed
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authorization error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// Allow only super-admin
export const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Super-admin role required.'
      });
      return;
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authorization error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
