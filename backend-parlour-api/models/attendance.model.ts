import mongoose, { Schema, Document, Model } from 'mongoose';
import { IEmployee } from './employee.model.js';

// Define consistent attendance action types
export enum AttendanceActionType {
  CHECK_IN = 'check-in',
  CHECK_OUT = 'check-out'
}

// Define the Attendance interface
export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId | IEmployee;
  type: AttendanceActionType;
  timestamp: Date;
  dateOnly: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create an interface for AttendanceModel with static methods
interface IAttendanceModel extends Model<IAttendance> {
  findLastAction(employeeId: string, date: string): Promise<IAttendance | null>;
}

// Create the Attendance schema with improved validation
const AttendanceSchema: Schema = new Schema(
  {
    employeeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Employee',
      required: [true, 'Employee ID is required']
    },
    type: { 
      type: String, 
      enum: Object.values(AttendanceActionType),
      required: [true, 'Attendance type is required']
    },
    timestamp: { 
      type: Date, 
      default: Date.now,
      required: [true, 'Timestamp is required']
    },
    dateOnly: {
      type: String,
      required: true,
      // Generate YYYY-MM-DD format from timestamp on save if not provided
      default: function(this: IAttendance) {
        const date = this.timestamp || new Date();
        return date.toISOString().split('T')[0];
      },
      validate: {
        validator: function(v: string) {
          // Ensure format is YYYY-MM-DD
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid date format (YYYY-MM-DD)!`
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Optimized compound indexes for common query patterns
AttendanceSchema.index({ employeeId: 1, dateOnly: 1 });
AttendanceSchema.index({ dateOnly: 1 });
AttendanceSchema.index({ timestamp: 1 });

// Pre-save middleware to ensure dateOnly is always consistent with timestamp
AttendanceSchema.pre('save', function(next) {
  if (this.isModified('timestamp')) {
    this.dateOnly = new Date(this.timestamp as Date).toISOString().split('T')[0];
  }
  next();
});

// Static method to find last action for an employee
AttendanceSchema.statics.findLastAction = async function(employeeId: string, date: string) {
  const lastAction = await this.findOne(
    { employeeId, dateOnly: date },
    {},
    { sort: { timestamp: -1 } }
  );
  return lastAction;
};

// Export the model
export const AttendanceModel = mongoose.model<IAttendance, IAttendanceModel>('Attendance', AttendanceSchema);
