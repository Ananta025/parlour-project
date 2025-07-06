// User schema with name, email, password, and role
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['super-admin', 'admin'], default: 'admin' },
});

export default mongoose.model('User', userSchema);
