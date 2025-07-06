// Login logic: check credentials, return token
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';

interface LoginRequest {
  email: string;
  password: string;
}

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginRequest;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user._id.toString(),
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};
