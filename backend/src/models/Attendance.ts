import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  project: mongoose.Types.ObjectId;
  participant: mongoose.Types.ObjectId;
  /** ISO date key YYYY-MM-DD representing the attendance day */
  date: string;
  /** For now we only store Active; lack of a record means Inactive/Absent. */
  status: 'Active';
}

const AttendanceSchema: Schema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    participant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ['Active'],
      default: 'Active',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

AttendanceSchema.index({ project: 1, participant: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
