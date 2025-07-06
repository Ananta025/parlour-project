import { Request, Response } from 'express';
import { TaskModel, TaskStatus, ITask } from '../models/task.model.js';

// Create a new task
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskData = req.body;
    
    // Add creator information if available
    if (req.user?.id) {
      taskData.createdBy = req.user.id;
    }
    
    const newTask = await TaskModel.create(taskData);
    
    res.status(201).json({
      success: true,
      data: newTask
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create task'
    });
  }
};

// Get all tasks
export const getTasks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await TaskModel.find()
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    
    // Map tasks to include employee name for easier frontend display
    const enhancedTasks = tasks.map(task => {
      // Type assertion for populated field
      const assignedEmployee = task.assignedTo as any;
      
      return {
        id: task._id,
        title: task.title,
        description: task.description,
        assignedTo: assignedEmployee?._id || null,
        employeeName: assignedEmployee?.name || 'Unassigned',
        dueDate: task.dueDate,
        status: task.status
      };
    });
    
    res.status(200).json({
      success: true,
      count: enhancedTasks.length,
      data: enhancedTasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve tasks'
    });
  }
};

// Update a task by ID
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedTask = await TaskModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');
    
    if (!updatedTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task'
    });
  }
};

// Delete a task by ID
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await TaskModel.findByIdAndDelete(req.params.id);
    
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete task'
    });
  }
};

// Update task status
export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status: string };
    
    // Validate status
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
      return;
    }
    
    const updatedTask = await TaskModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');
    
    if (!updatedTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found'
      });
      return;
    }
    
    // Notify via Socket.IO if available
    if (req.io) {
      req.io.emit('task-update', {
        id: (updatedTask as ITask & { _id: any })._id.toString(),
        status: (updatedTask as ITask).status
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task status'
    });
  }
};
