import { Server as SocketIOServer } from 'socket.io';
import { Document } from 'mongoose';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      io?: SocketIOServer;
    }
  }
}

// User payload interface for JWT token
export interface UserPayload {
  id: string;
  role: string;
}

// Response types for consistent API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

// Socket response type
export interface SocketResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Additional interfaces can be added here as needed
