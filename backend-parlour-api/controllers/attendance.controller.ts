import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AttendanceModel, AttendanceActionType, IAttendance } from '../models/attendance.model.js';
import EmployeeModel, { IEmployee } from '../models/employee.model.js';
import { ApiResponse } from '../types/index.js';

// Create new attendance record (API endpoint)
export const createAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, type, timestamp = new Date() } = req.body;
    
    // Validation
    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee ID is required' });
      return;
    }
    
    if (!type || !Object.values(AttendanceActionType).includes(type)) {
      res.status(400).json({ 
        success: false, 
        message: `Invalid attendance type. Must be one of: ${Object.values(AttendanceActionType).join(', ')}` 
      });
      return;
    }
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      res.status(400).json({ success: false, message: 'Invalid employee ID format' });
      return;
    }
    
    // Check if employee exists
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }
    
    // Get date in YYYY-MM-DD format
    const dateOnly = new Date(timestamp).toISOString().split('T')[0];
    
    // Check for recent duplicate action
    const recentAction = await AttendanceModel.findOne({
      employeeId,
      type,
      timestamp: { $gte: new Date(Date.now() - 5 * 60000) } // 5 minutes
    });
    
    if (recentAction) {
      res.status(409).json({ 
        success: false, 
        message: `Already ${type === AttendanceActionType.CHECK_IN ? 'checked in' : 'checked out'} recently` 
      });
      return;
    }
    
    // Create and save new attendance record
    const attendance = new AttendanceModel({
      employeeId,
      type,
      timestamp: new Date(timestamp),
      dateOnly
    });
    
    await attendance.save();
    
    // Get populated data
    const populatedRecord = await AttendanceModel.findById(attendance._id)
      .populate('employeeId', 'name email')
      .lean();
    
    if (!populatedRecord) {
      res.status(500).json({ success: false, message: 'Failed to retrieve created record' });
      return;
    }
    
    // Safety check and type assertion for populated employee
    const employeeData = populatedRecord.employeeId as unknown as { _id: mongoose.Types.ObjectId | string; name: string; email: string };
    
    // Create response payload
    const payload = {
      id: populatedRecord._id.toString(),
      employeeId: employeeData._id.toString(),
      employeeName: employeeData.name || 'Unknown',
      type: populatedRecord.type,
      action: populatedRecord.type === AttendanceActionType.CHECK_IN ? 'in' : 'out',
      timestamp: populatedRecord.timestamp,
      dateOnly: populatedRecord.dateOnly
    };
    
    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('attendance:update', payload);
      req.io.emit('attendance:daily-update', {
        employeeId: employeeData._id.toString(),
        dateOnly: populatedRecord.dateOnly,
        updated: true
      });
    }
    
    // Return success response
    res.status(201).json({ success: true, data: payload });
    
  } catch (error) {
    console.error('Error creating attendance record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create attendance record',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get attendance logs with flexible filtering
export const getAttendanceLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get query parameters with defaults
    const { date, dateOnly, dateFrom, dateTo, employeeId } = req.query;
    
    // Build filter query
    const filter: Record<string, any> = {};
    
    // Handle date filtering - multiple options for flexibility
    if (date || dateOnly) {
      filter.dateOnly = date || dateOnly;
    } else if (dateFrom || dateTo) {
      filter.dateOnly = {};
      if (dateFrom) filter.dateOnly.$gte = dateFrom;
      if (dateTo) filter.dateOnly.$lte = dateTo;
    }
    
    // Employee filtering
    if (employeeId) {
      filter.employeeId = employeeId;
    }
    
    // Execute query with population
    const logs = await AttendanceModel.find(filter)
      .sort({ timestamp: -1 })
      .populate('employeeId', 'name email')
      .lean();
    
    // Format results for consistent frontend consumption
    const formattedLogs = logs.map(log => {
      const employee = log.employeeId as IEmployee | { _id: mongoose.Types.ObjectId; name?: string; email?: string } | mongoose.Types.ObjectId | string;
      const employeeId = typeof employee === 'object' && '_id' in employee ? (employee as { _id: mongoose.Types.ObjectId })._id.toString() : String(employee);
      
      return {
        id: log._id.toString(),
        employeeId,
        type: log.type,
        action: log.type === AttendanceActionType.CHECK_IN ? 'in' : 'out',
        timestamp: log.timestamp,
        dateOnly: log.dateOnly,
        time: new Date(log.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        date: new Date(log.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        employee: typeof employee === 'object' && 'name' in employee ? {
          id: employeeId,
          name: employee.name || 'Unknown',
          email: employee.email || ''
        } : null
      };
    });
    
    res.status(200).json({ success: true, data: formattedLogs });
    
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get aggregated daily attendance summary
export const getAggregatedAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, dateFrom, dateTo, employeeId } = req.query;
    
    // Build match stage for aggregation
    const matchStage: any = {};
    
    // Date filtering
    if (date) {
      matchStage.dateOnly = date;
    } else if (dateFrom && dateTo) {
      matchStage.dateOnly = { $gte: dateFrom, $lte: dateTo };
    } else if (dateFrom) {
      matchStage.dateOnly = { $gte: dateFrom };
    } else if (dateTo) {
      matchStage.dateOnly = { $lte: dateTo };
    } else {
      // Default to today if no date specified
      matchStage.dateOnly = new Date().toISOString().split('T')[0];
    }
    
    // Employee filtering
    if (employeeId) {
      matchStage.employeeId = new mongoose.Types.ObjectId(employeeId as string);
    }

    // Aggregation pipeline for daily summary
    const aggregatedLogs = await AttendanceModel.aggregate([
      { $match: matchStage },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: {
            employeeId: "$employeeId",
            dateOnly: "$dateOnly"
          },
          firstCheckIn: {
            $min: {
              $cond: [
                { $eq: ["$type", AttendanceActionType.CHECK_IN] },
                "$timestamp",
                null
              ]
            }
          },
          lastCheckOut: {
            $max: {
              $cond: [
                { $eq: ["$type", AttendanceActionType.CHECK_OUT] },
                "$timestamp",
                null
              ]
            }
          },
          allLogs: { $push: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id.employeeId",
          foreignField: "_id",
          as: "employee"
        }
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id.employeeId" }, // For frontend compatibility
          employeeId: { $toString: "$_id.employeeId" },
          employeeName: "$employee.name",
          date: "$_id.dateOnly",
          checkInTimestamp: "$firstCheckIn",
          checkOutTimestamp: "$lastCheckOut",
          totalHours: {
            $cond: [
              { $and: ["$firstCheckIn", "$lastCheckOut"] },
              { $divide: [{ $subtract: ["$lastCheckOut", "$firstCheckIn"] }, 3600000] },
              null
            ]
          },
          logIds: "$allLogs._id"
        }
      },
      { $sort: { date: -1, employeeName: 1 } }
    ]);

    // Format the result for frontend display
    // Interface for the aggregation result from MongoDB
    interface AggregatedAttendanceLog {
      id: string;
      employeeId: string;
      employeeName: string;
      date: string;
      checkInTimestamp: Date | null;
      checkOutTimestamp: Date | null;
      totalHours: number | null;
      logIds: mongoose.Types.ObjectId[];
    }

    // Interface for the formatted response
    interface FormattedAttendanceLog {
      id: string;
      employeeId: string;
      employeeName: string;
      date: string;
      dateFormatted: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      checkInTimestamp: Date | null;
      checkOutTimestamp: Date | null;
      totalHours: number | null;
      logIds: string[];
    }

    const formattedResults: FormattedAttendanceLog[] = aggregatedLogs.map((item: AggregatedAttendanceLog) => ({
      id: item.logIds.join(','), // Join IDs for edit/delete operations
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      date: item.date,
      dateFormatted: new Date(item.date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
      }),
      checkInTime: item.checkInTimestamp 
      ? new Date(item.checkInTimestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
        }) 
      : null,
      checkOutTime: item.checkOutTimestamp 
      ? new Date(item.checkOutTimestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
        }) 
      : null,
      checkInTimestamp: item.checkInTimestamp,
      checkOutTimestamp: item.checkOutTimestamp,
      totalHours: item.totalHours !== null ? Number(item.totalHours.toFixed(2)) : null,
      logIds: item.logIds.map(id => id.toString())
    }));

    res.status(200).json({ 
      success: true,
      data: formattedResults 
    });
  } catch (error) {
    console.error('Error fetching aggregated attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch aggregated attendance data',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Enhanced update attendance record (super-admin only)
export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { timestamp, type, checkInTime, checkOutTime } = req.body;
    
    // Check if this is a single record update or a daily record update
    if (timestamp && type) {
      // Single record update
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid attendance record ID format'
        });
        return;
      }

      // Find the record
      const attendanceRecord = await AttendanceModel.findById(id).exec() as (IAttendance & { _id: mongoose.Types.ObjectId }) | null;
      
      if (!attendanceRecord) {
        res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
        return;
      }

      // Validate the type
      if (type && !Object.values(AttendanceActionType).includes(type)) {
        res.status(400).json({
          success: false,
          message: `Invalid attendance type. Must be one of: ${Object.values(AttendanceActionType).join(', ')}`
        });
        return;
      }

      // Update the record
      attendanceRecord.timestamp = new Date(timestamp);
      attendanceRecord.type = type || attendanceRecord.type;
      
      // Ensure dateOnly is updated based on the new timestamp
      attendanceRecord.dateOnly = new Date(timestamp).toISOString().split('T')[0];
      
      await attendanceRecord.save();
      
      // Get employee details for notification
      const employee = await EmployeeModel.findById(attendanceRecord.employeeId);
      
      // Emit socket update
      req.io?.emit('attendance:update', {
        id: attendanceRecord._id.toString(),
        employeeId: attendanceRecord.employeeId.toString(),
        employeeName: employee?.name || 'Unknown',
        type: attendanceRecord.type,
        action: attendanceRecord.type === AttendanceActionType.CHECK_IN ? 'in' : 'out',
        timestamp: attendanceRecord.timestamp,
        dateOnly: attendanceRecord.dateOnly
      });
      
      res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully'
      });
      return;
    } 
    else if (checkInTime !== undefined || checkOutTime !== undefined) {
      // Daily record update (multiple records)
      
      // Get log IDs (might be comma-separated)
      const logIds = id.split(',');
      
      // Find the first log to get basic information
      const firstLog = await AttendanceModel.findById(logIds[0]);
      
      if (!firstLog) {
        res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
        return;
      }
      
      // Get employee ID and date
      const { employeeId, dateOnly } = firstLog;
      
      // Start a transaction for atomicity
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Remove all existing logs for this employee/date
        await AttendanceModel.deleteMany(
          { employeeId, dateOnly },
          { session }
        );
        
        // Create new check-in if provided
        if (checkInTime) {
          const newCheckIn = new AttendanceModel({
            employeeId,
            type: AttendanceActionType.CHECK_IN,
            timestamp: new Date(checkInTime),
            dateOnly
          });
          await newCheckIn.save({ session });
        }
        
        // Create new check-out if provided
        if (checkOutTime) {
          const newCheckOut = new AttendanceModel({
            employeeId,
            type: AttendanceActionType.CHECK_OUT,
            timestamp: new Date(checkOutTime),
            dateOnly
          });
          await newCheckOut.save({ session });
        }
        
        // Commit the transaction
        await session.commitTransaction();
        
        // Get employee details for notification
        const employee = await EmployeeModel.findById(employeeId);
        
        // Emit socket update
        req.io?.emit('attendance:daily-update', {
          employeeId: employeeId.toString(),
          dateOnly,
          updated: true
        });
        
        res.status(200).json({
          success: true,
          message: 'Attendance records updated successfully'
        });
        return;
      } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid update data. Please provide either timestamp and type for single record update, or checkInTime/checkOutTime for daily record update.'
      });
      return;
    }
  } catch (error) {
    console.error('Error updating attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance records',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Enhanced delete attendance record (super-admin only)
export const deleteAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // The ID might be a single ID or a comma-separated list
    const logIds = id.split(',');
    
    // Find the first log to get employeeId and dateOnly
    if (!mongoose.Types.ObjectId.isValid(logIds[0])) {
      res.status(400).json({
        success: false,
        message: 'Invalid attendance record ID format'
      });
      return;
    }
    
    const firstLog = await AttendanceModel.findById(logIds[0]);
    
    if (!firstLog) {
      res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
      return;
    }
    
    const { employeeId, dateOnly } = firstLog;
    
    // Get employee details for notification before deletion
    const employee = await EmployeeModel.findById(employeeId);
    
    // Determine if we're deleting a single record or all records for an employee/date
    let result;
    
    if (logIds.length === 1 && !id.includes(',')) {
      // Single record deletion
      result = await AttendanceModel.findByIdAndDelete(id);
      
      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
        return;
      }
    } else {
      // Delete all logs for this employee and date
      result = await AttendanceModel.deleteMany({
        employeeId,
        dateOnly
      });
    }
    
    // Emit socket event to notify clients
    req.io?.emit('attendance:daily-update', {
      employeeId: employeeId.toString(),
      employeeName: employee?.name || 'Unknown Employee',
      dateOnly,
      deleted: true
    });
    
    // Emit another event for single record deletion
    if (logIds.length === 1 && !id.includes(',')) {
      req.io?.emit('attendance:delete', {
        id,
        employeeId: employeeId.toString(),
        dateOnly
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully deleted attendance record(s)`,
      deletedCount: 'deletedCount' in result ? result.deletedCount : 1
    });
  } catch (error) {
    console.error('Error deleting attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance records',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
