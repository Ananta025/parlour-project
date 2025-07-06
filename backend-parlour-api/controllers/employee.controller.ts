import { Request, Response } from 'express';
import Employee, { IEmployee } from '../models/employee.model.js';

// Create a new employee
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    // Make sure we have all the required data
    const { name, email, mobile, role, position, joinDate, status, password } = req.body;
    
    if (!name || !email || !mobile || !role || !position) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
      return;
    }
    
    // Format join date correctly if provided
    const employeeData: any = {
      name, 
      email,
      mobile,
      role,
      position,
      status: typeof status === 'boolean' ? status : true
    };
    
    if (joinDate) {
      employeeData.joinDate = new Date(joinDate);
    }
    
    if (password) {
      employeeData.password = password; // In a real app, you should hash this
    }
    
    const newEmployee = await Employee.create(employeeData);
    
    res.status(201).json({
      success: true,
      data: newEmployee
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create employee'
    });
  }
};

// Get all employees
export const getEmployees = async (_req: Request, res: Response): Promise<void> => {
  try {
    const employees = await Employee.find();
    
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve employees'
    });
  }
};

// Update an employee by ID
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    
    // Format join date correctly if provided
    if (updates.joinDate) {
      updates.joinDate = new Date(updates.joinDate);
    }
    
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedEmployee) {
      res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: updatedEmployee
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update employee'
    });
  }
};

// Delete an employee by ID
export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete employee'
    });
  }
};
