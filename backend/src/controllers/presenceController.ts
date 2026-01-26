import { Request, Response } from 'express';
import { getPresenceForUserIds } from '../socket';

export const getPresence = (req: Request, res: Response) => {
  try {
    const raw = (req.query.userIds as string | undefined) || '';
    const ids = raw
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return res.json({});
    }

    const presence = getPresenceForUserIds(ids);
    return res.json(presence);
  } catch (error) {
    console.error('Failed to get presence', error);
    return res.status(500).json({ message: 'Failed to get presence' });
  }
};
