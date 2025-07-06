import mongoose, { Schema, Document } from 'mongoose';

// Define the Employee interface
export interface IEmployee extends Document {
  name: string;
  email: string;
  mobile: string;
  role: string;
  status: boolean;
  position: string;
  joinDate: Date;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Employee schema
const EmployeeSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: Boolean, default: true },
    position: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },
    password: { type: String }
  },
  {
    timestamps: true
  }
);

// Create and export the Employee model
export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
