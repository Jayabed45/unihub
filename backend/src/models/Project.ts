import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string;
  projectLeader: mongoose.Types.ObjectId;
  activities: mongoose.Types.ObjectId[];
}

const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  projectLeader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  activities: [{ type: Schema.Types.ObjectId, ref: 'Activity' }],
});

export default mongoose.model<IProject>('Project', ProjectSchema);
