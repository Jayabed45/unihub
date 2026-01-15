import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
});

export default mongoose.model<IUser>('User', UserSchema);
