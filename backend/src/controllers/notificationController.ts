import { Request, Response } from 'express';
import Notification from '../models/Notification';

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50).lean();
    return res.json(notifications);
  } catch (error) {
    console.error('Error listing notifications', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};
