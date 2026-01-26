import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  project?: mongoose.Types.ObjectId;
  recipient?: mongoose.Types.ObjectId;
  requester?: mongoose.Types.ObjectId;
  joinStatus?: 'Requested' | 'Approved' | 'Rejected';
  read: boolean;
  createdAt: Date;
  showInPanel?: boolean;
}

const NotificationSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: false },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    joinStatus: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected'],
      required: false,
      default: 'Requested',
    },
    read: { type: Boolean, default: false, required: true },
    showInPanel: { type: Boolean, default: true, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
