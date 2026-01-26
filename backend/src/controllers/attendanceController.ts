import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Project from '../models/Project';
import User from '../models/User';
import Notification from '../models/Notification';
import { notifyUserNewNotifications } from '../socket';

const todayKey = () => {
  const now = new Date();
  // Normalize to YYYY-MM-DD so client and server can talk about "today" easily
  return now.toISOString().slice(0, 10);
};

export const markSelfAttendance = async (req: Request, res: Response) => {
  try {
    const { projectId, participantId } = req.body as {
      projectId?: string;
      participantId?: string;
    };

    if (!projectId || !participantId) {
      return res.status(400).json({ message: 'projectId and participantId are required' });
    }

    const date = todayKey();

    const record = await Attendance.findOneAndUpdate(
      {
        project: projectId,
        participant: participantId,
        date,
      },
      {
        status: 'Active',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    // Best-effort: notify the project leader that this participant is active today
    try {
      const project = await Project.findById(projectId).lean();
      if (project && project.projectLeader) {
        const leaderId = String(project.projectLeader);

        let participantName: string | undefined;
        try {
          const participant = await User.findById(participantId).lean();
          participantName = participant?.username || participant?.email;
        } catch (lookupError) {
          console.error('Failed to look up participant for attendance notification', lookupError);
        }

        const message = participantName
          ? `${participantName} active today`
          : 'A participant is active today';

        await Notification.create({
          title: 'Attendance',
          message,
          project: project._id,
          recipient: project.projectLeader as any,
        });

        notifyUserNewNotifications(leaderId);
      }
    } catch (notifyError) {
      console.error('Failed to notify leader about attendance', notifyError);
    }

    return res.status(200).json(record);
  } catch (error) {
    console.error('Failed to mark self attendance', error);
    return res.status(500).json({ message: 'Failed to mark attendance' });
  }
};

export const getProjectAttendanceForDate = async (req: Request, res: Response) => {
  try {
    const { projectId, date } = req.query as { projectId?: string; date?: string };

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    const day = (date && String(date).trim()) || todayKey();

    const records = await Attendance.find({ project: projectId, date: day }).lean();

    const mapped = records.map((r) => ({
      id: String(r._id),
      projectId: String(r.project),
      participantId: String(r.participant),
      date: r.date,
      status: r.status,
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Failed to fetch project attendance', error);
    return res.status(500).json({ message: 'Failed to fetch attendance' });
  }
};
