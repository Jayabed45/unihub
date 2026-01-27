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

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { read: true } },
      { new: true },
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read', error);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsRead = async (_req: Request, res: Response) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read', error);
    return res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
};
