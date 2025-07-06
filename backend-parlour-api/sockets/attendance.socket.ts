import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { AttendanceModel, AttendanceActionType } from '../models/attendance.model.js';
import EmployeeModel from '../models/employee.model.js';
import { SocketResponse } from '../types/index.js';

// Type for attendance punch data
interface AttendancePunchData {
  employeeId: string;
  type: AttendanceActionType;
  timestamp?: Date;
}

export const registerAttendanceSocket = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.handshake.auth?.userId || 'Unauthenticated'}`);

    // Handle attendance punch events
    socket.on('attendance:punch', async (data: AttendancePunchData, callback?: (response: SocketResponse) => void) => {
      // Ensure callback exists and is a function
      const respond = (response: SocketResponse): void => {
        if (typeof callback === 'function') {
          callback(response);
        }
      };

      try {
        // Validate required fields
        const { employeeId, type } = data;
        
        if (!employeeId) {
          return respond({ success: false, error: 'Employee ID is required' });
        }
        
        if (!type || !Object.values(AttendanceActionType).includes(type)) {
          return respond({ 
            success: false, 
            error: `Invalid attendance type. Must be one of: ${Object.values(AttendanceActionType).join(', ')}` 
          });
        }
        
        // Validate MongoDB ID format
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
          return respond({ success: false, error: 'Invalid employee ID format' });
        }

        // Check if employee exists
        const employee = await EmployeeModel.findById(employeeId);
        if (!employee) {
          return respond({ success: false, error: 'Employee not found' });
        }
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Prevent duplicate actions within a short timeframe (5 minutes)
        const recentAction = await AttendanceModel.findOne({
          employeeId,
          type,
          timestamp: { $gte: new Date(Date.now() - 5 * 60000) } // 5 minutes
        });
        
        if (recentAction) {
          return respond({ 
            success: false, 
            error: `Already ${type === AttendanceActionType.CHECK_IN ? 'checked in' : 'checked out'} recently` 
          });
        }
        
        // Create attendance record
        const attendance = new AttendanceModel({
          employeeId,
          type,
          timestamp: new Date(),
          dateOnly: today
        });
        
        // Save the record
        await attendance.save();
        
        // Get populated data for response
        const populatedRecord = await AttendanceModel.findById(attendance._id)
          .populate('employeeId', 'name email')
          .lean();
          
        if (!populatedRecord) {
          return respond({ success: false, error: 'Failed to retrieve created record' });
        }
        
        // Safety check and type assertion for populated employee
        const employeeData = populatedRecord.employeeId as unknown as { _id: string | mongoose.Types.ObjectId; name: string; email: string };
        
        // Create standardized payload for socket events and response
        const payload = {
          id: populatedRecord._id.toString(),
          employeeId: employeeData._id.toString(),
          employeeName: employeeData.name || 'Unknown',
          type: populatedRecord.type,
          // For backward compatibility
          action: populatedRecord.type === AttendanceActionType.CHECK_IN ? 'in' : 'out',
          timestamp: populatedRecord.timestamp,
          dateOnly: populatedRecord.dateOnly,
          // Format for display
          time: new Date(populatedRecord.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          date: new Date(populatedRecord.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        };

        // Broadcast to all clients (including the sender)
        io.emit('attendance:update', payload);
        
        // Send success response to the client that made the request
        respond({ success: true, data: payload });
        
        // Also trigger daily summary update
        io.emit('attendance:daily-update', {
          employeeId: employeeData._id.toString(),
          dateOnly: populatedRecord.dateOnly,
          updated: true
        });
        
      } catch (error) {
        console.error('Attendance socket error:', error);
        respond({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Internal server error' 
        });
      }
    });
  });
};
