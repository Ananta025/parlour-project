import mongoose, { Document, Schema } from 'mongoose';
import { IEmployee } from './employee.model.js';

// Define task status enum
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed'
}

// Define the Task interface
export interface ITask extends Document {
  title: string;
  description?: string;
  assignedTo: mongoose.Types.ObjectId | IEmployee;
  dueDate: Date;
  status: TaskStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Task schema
const TaskSchema: Schema = new Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true
    },
    description: { 
      type: String,
      default: ''
    },
    assignedTo: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Employee',
      required: true 
    },
    dueDate: { 
      type: Date, 
      required: true 
    },
    status: { 
      type: String, 
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Export the model
export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);

// Export the status enum for use in other files
export default TaskStatus ;
