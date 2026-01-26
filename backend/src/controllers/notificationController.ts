import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { notifyUserNewNotifications } from '../socket';

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const { recipient, includeHidden } = req.query as { recipient?: string; includeHidden?: string };

    const filter: Record<string, any> = {};
    if (recipient) {
      filter.recipient = recipient;
    } else {
      filter.recipient = { $exists: false };
    }

    // By default, hide notifications that are marked showInPanel === false (used only for feeds/timeline)
    if (!includeHidden || includeHidden !== 'true') {
      filter.$or = [{ showInPanel: { $exists: false } }, { showInPanel: true }];
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    return res.json(notifications);
  } catch (error) {
    console.error('Error listing notifications', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const listJoinRequestsForParticipant = async (req: Request, res: Response) => {
  try {
    const { participantId } = req.query as { participantId?: string };

    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' });
    }

    const notifications = await Notification.find({
      requester: participantId,
      title: 'Join request received',
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('project')
      .lean();

    const mapped = notifications.map((n) => {
      const project: any = n.project || {};
      const projectStatus = project.status as 'Pending' | 'Approved' | 'Rejected' | undefined;
      const status = (n as any).joinStatus || 'Requested';

      return {
        id: String(n._id),
        projectId: project ? String(project._id) : undefined,
        projectName: project?.name || n.message,
        projectStatus: projectStatus || 'Pending',
        status,
        createdAt: n.createdAt,
      };
    });

    return res.json(mapped);
  } catch (error) {
    console.error('Error listing join requests for participant', error);
    return res.status(500).json({ message: 'Failed to fetch join requests' });
  }
};

export const listJoinRequestsForLeader = async (req: Request, res: Response) => {
  try {
    const { leaderId } = req.query as { leaderId?: string };

    if (!leaderId) {
      return res.status(400).json({ message: 'leaderId is required' });
    }

    const notifications = await Notification.find({
      recipient: leaderId,
      title: 'Join request received',
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('project')
      .populate('requester')
      .lean();

    const mapped = notifications.map((n) => {
      const project: any = n.project || {};
      const requester: any = (n as any).requester || {};
      const projectStatus = project.status as 'Pending' | 'Approved' | 'Rejected' | undefined;
      const status = (n as any).joinStatus || 'Requested';

      return {
        id: String(n._id),
        projectId: project ? String(project._id) : undefined,
        projectName: project?.name || n.message,
        projectStatus: projectStatus || 'Pending',
        status,
        requesterId: requester?._id ? String(requester._id) : undefined,
        requesterName: requester?.username || undefined,
        requesterEmail: requester?.email || undefined,
        createdAt: n.createdAt,
      };
    });

    return res.json(mapped);
  } catch (error) {
    console.error('Error listing join requests for leader', error);
    return res.status(500).json({ message: 'Failed to fetch join requests' });
  }
};

export const updateJoinRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: 'Requested' | 'Approved' | 'Rejected' };

    if (!status || !['Requested', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const notificationDoc = await Notification.findByIdAndUpdate(
      id,
      { joinStatus: status },
      { new: true },
    );

    if (!notificationDoc) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    // If approved, notify the participant that their request was approved
    if (status === 'Approved') {
      try {
        const populated = await notificationDoc.populate('recipient');
        const leader: any = (populated as any).recipient || {};
        const leaderEmail: string | undefined = leader.email;

        const participantId = (notificationDoc as any).requester as string | undefined;

        if (participantId) {
          const message = leaderEmail
            ? `${leaderEmail} approved your request`
            : 'Your project leader approved your request';

          await Notification.create({
            title: 'Join request approved',
            message,
            project: (notificationDoc as any).project,
            recipient: participantId,
          });

          notifyUserNewNotifications(participantId);
        }
      } catch (notifyError) {
        console.error('Failed to notify participant about join approval', notifyError);
      }
    }

    return res.json({ message: 'Join request updated', joinStatus: (notificationDoc as any).joinStatus });
  } catch (error) {
    console.error('Error updating join request status', error);
    return res.status(500).json({ message: 'Failed to update join request status' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
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
