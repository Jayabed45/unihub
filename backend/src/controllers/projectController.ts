import { Request, Response } from 'express';
import Project from '../models/Project';
import Notification from '../models/Notification';
import User from '../models/User';
import ActivityRegistration from '../models/ActivityRegistration';
import ProjectBeneficiary from '../models/ProjectBeneficiary';
import { getIO } from '../socket';

export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      projectLeaderId,
      sections,
      totals,
    }: {
      name?: string;
      description?: string;
      projectLeaderId?: string;
      sections?: Record<string, any>;
      totals?: Record<string, any>;
    } = req.body || {};

    if (!projectLeaderId) {
      return res.status(400).json({ message: 'projectLeaderId is required' });
    }

    const project = new Project({
      name: name && name.trim() ? name.trim() : 'Untitled Project',
      description: description && description.trim() ? description.trim() : 'Extension project proposal',
      projectLeader: projectLeaderId,
      activities: [],
      proposalData: sections || {},
      summary: totals || {},
      status: 'Pending',
    } as any);

    const saved = await project.save();

    let leaderEmail: string | undefined;
    try {
      const leader = await User.findById(projectLeaderId).lean();
      leaderEmail = leader?.email;
    } catch (lookupError) {
      console.error('Failed to lookup project leader for notification', lookupError);
    }

    const createdNotification = await Notification.create({
      title: 'New project created',
      message: leaderEmail ? `${leaderEmail} created new project` : `${saved.name} created new project`,
      project: saved._id,
    });

    try {
      const io = getIO();
      io.emit('notification:new', {
        id: createdNotification._id.toString(),
        title: createdNotification.title,
        message: createdNotification.message,
        projectId: saved._id.toString(),
        timestamp: createdNotification.createdAt
          ? createdNotification.createdAt.toLocaleString('en-PH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '',
        read: createdNotification.read,
      });
    } catch (socketError) {
      console.error('Failed to emit new project notification over socket', socketError);
    }
    return res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating project proposal', error);
    return res.status(500).json({ message: 'Failed to create project proposal' });
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    const { projectLeaderId } = req.query as { projectLeaderId?: string };

    const filter: Record<string, any> = {};
    if (projectLeaderId) {
      filter.projectLeader = projectLeaderId;
    }

    const projects = await Project.find(filter).sort({ _id: -1 }).lean();
    return res.json(projects);
  } catch (error) {
    console.error('Error listing projects', error);
    return res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json(project);
  } catch (error) {
    console.error('Error fetching project', error);
    return res.status(500).json({ message: 'Failed to fetch project' });
  }
};

export const evaluateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, evaluation } = req.body as {
      status?: 'Pending' | 'Approved' | 'Rejected';
      evaluation?: any;
    };

    if (!status && !evaluation) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    if (status && !['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const update: Record<string, any> = {};
    if (typeof evaluation !== 'undefined') {
      update.evaluation = evaluation;
    }
    if (status) {
      update.status = status;
    }

    const project = await Project.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (status === 'Approved') {
      try {
        const approvalNotification = await Notification.create({
          title: 'Project approved',
          message: 'Admin approved your project',
          project: project._id,
        });

        try {
          const io = getIO();
          io.emit('notification:new', {
            id: approvalNotification._id.toString(),
            title: approvalNotification.title,
            message: approvalNotification.message,
            projectId: project._id.toString(),
            timestamp: approvalNotification.createdAt
              ? approvalNotification.createdAt.toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '',
            read: approvalNotification.read,
          });
        } catch (socketError) {
          console.error('Failed to emit approval notification over socket', socketError);
        }
      } catch (notifyError) {
        console.error('Failed to create approval notification', notifyError);
      }
    }

    return res.json(project);
  } catch (error) {
    console.error('Error evaluating project', error);
    return res.status(500).json({ message: 'Failed to evaluate project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting project', error);
    return res.status(500).json({ message: 'Failed to delete project' });
  }
};

export const requestJoinProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.body as { email?: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required to request to join a project' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const createdNotification = await Notification.create({
      title: 'Join request',
      message: `${email} wants to join`,
      project: project._id,
    });

    try {
      const io = getIO();
      io.emit('notification:new', {
        id: createdNotification._id.toString(),
        title: createdNotification.title,
        message: createdNotification.message,
        projectId: project._id.toString(),
        timestamp: createdNotification.createdAt
          ? createdNotification.createdAt.toLocaleString('en-PH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '',
        read: createdNotification.read,
      });
    } catch (socketError) {
      console.error('Failed to emit join request notification over socket', socketError);
    }

    return res.status(201).json({ message: 'Join request sent' });
  } catch (error) {
    console.error('Error requesting to join project', error);
    return res.status(500).json({ message: 'Failed to request to join project' });
  }
};

export const respondToJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, decision } = req.body as { email?: string; decision?: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required to respond to a join request' });
    }

    const normalizedDecision =
      decision === 'approved' || decision === 'declined' ? (decision as 'approved' | 'declined') : undefined;

    if (!normalizedDecision) {
      return res.status(400).json({ message: 'Decision must be either "approved" or "declined"' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Mark matching join-request notifications as read so they no longer show as pending on leader side
    try {
      await Notification.updateMany(
        {
          title: 'Join request',
          project: project._id,
          message: `${email} wants to join`,
        },
        { $set: { read: true } },
      );
    } catch (markError) {
      console.error('Failed to mark join request notifications as read', markError);
    }

    let title: string;
    let message: string;

    if (normalizedDecision === 'approved') {
      title = 'Join request approved';
      message = `${email} - Your request to join "${project.name}" was approved.`;

      try {
        await ProjectBeneficiary.findOneAndUpdate(
          { project: project._id, email },
          { $set: { status: 'active' } },
          { upsert: true, new: true },
        ).lean();
      } catch (beneficiaryError) {
        console.error('Failed to upsert project beneficiary on approval', beneficiaryError);
      }
    } else {
      title = 'Join request declined';
      message = `${email} - Your request to join "${project.name}" was declined.`;
    }

    const createdNotification = await Notification.create({
      title,
      message,
      project: project._id,
    });

    try {
      const io = getIO();
      io.emit('notification:new', {
        id: createdNotification._id.toString(),
        title: createdNotification.title,
        message: createdNotification.message,
        projectId: project._id.toString(),
        timestamp: createdNotification.createdAt
          ? createdNotification.createdAt.toLocaleString('en-PH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '',
        read: createdNotification.read,
      });
    } catch (socketError) {
      console.error('Failed to emit join request response notification over socket', socketError);
    }

    return res.json({
      message:
        normalizedDecision === 'approved'
          ? 'Join request approved and participant notified'
          : 'Join request declined and participant notified',
    });
  } catch (error) {
    console.error('Error responding to join request', error);
    return res.status(500).json({ message: 'Failed to respond to join request' });
  }
};

export const joinActivity = async (req: Request, res: Response) => {
  try {
    const { id, activityId } = req.params;
    const { email } = req.body as { email?: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required to join an activity' });
    }

    const rawActivityId = Array.isArray(activityId) ? activityId[0] : activityId;
    const numericActivityId = Number.parseInt(rawActivityId, 10);
    if (!Number.isFinite(numericActivityId) || numericActivityId < 0) {
      return res.status(400).json({ message: 'Invalid activityId' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    let activityTitle = `Activity ${numericActivityId + 1}`;

    try {
      const proposal: any = (project as any).proposalData;
      const trainingSnapshot = proposal && proposal['training-design'];

      if (trainingSnapshot && Array.isArray(trainingSnapshot.editableCells)) {
        const cells: string[] = trainingSnapshot.editableCells;
        let indexCounter = 0;

        for (let i = 0; i + 1 < cells.length; i += 2) {
          const title = (cells[i] || '').trim();
          const resourcePerson = (cells[i + 1] || '').trim();

          if (!title) {
            continue;
          }

          if (indexCounter === numericActivityId) {
            activityTitle = title;
            break;
          }

          indexCounter += 1;
        }
      }
    } catch (parseError) {
      console.error('Failed to derive activity title for joinActivity', parseError);
    }

    try {
      const existing = await ActivityRegistration.findOne({
        project: project._id,
        activityId: numericActivityId,
        participantEmail: email,
      }).lean();

      if (existing) {
        return res.status(409).json({ message: 'You are already registered for this activity' });
      }

      await ActivityRegistration.create({
        project: project._id,
        activityId: numericActivityId,
        participantEmail: email,
        status: 'registered',
      });
    } catch (regError) {
      console.error('Failed to register participant for activity', regError);
      return res.status(500).json({ message: 'Failed to join activity' });
    }

    try {
      const createdNotification = await Notification.create({
        title: 'Activity join',
        message: `${email} joined activity "${activityTitle}" of project "${project.name}"`,
        project: project._id,
      });

      try {
        const io = getIO();
        io.emit('notification:new', {
          id: createdNotification._id.toString(),
          title: createdNotification.title,
          message: createdNotification.message,
          projectId: project._id.toString(),
          timestamp: createdNotification.createdAt
            ? createdNotification.createdAt.toLocaleString('en-PH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '',
          read: createdNotification.read,
        });
      } catch (socketError) {
        console.error('Failed to emit activity join notification over socket', socketError);
      }
    } catch (notifyError) {
      console.error('Failed to create activity join notification', notifyError);
    }

    return res.status(201).json({ message: 'Joined activity' });
  } catch (error) {
    console.error('Error joining activity', error);
    return res.status(500).json({ message: 'Failed to join activity' });
  }
};

export const listActivityRegistrations = async (req: Request, res: Response) => {
  try {
    const { id, activityId } = req.params;
    const rawActivityId = Array.isArray(activityId) ? activityId[0] : activityId;
    const numericActivityId = Number.parseInt(rawActivityId, 10);

    if (!Number.isFinite(numericActivityId) || numericActivityId < 0) {
      return res.status(400).json({ message: 'Invalid activityId' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const registrations = await ActivityRegistration.find({
      project: project._id,
      activityId: numericActivityId,
    })
      .sort({ createdAt: 1 })
      .lean();

    const mapped = registrations.map((reg) => ({
      participantEmail: reg.participantEmail,
      status: reg.status,
      updatedAt: reg.updatedAt,
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Error listing activity registrations', error);
    return res.status(500).json({ message: 'Failed to load activity registrations' });
  }
};

export const updateActivityRegistration = async (req: Request, res: Response) => {
  try {
    const { id, activityId } = req.params;
    const { email, status } = req.body as { email?: string; status?: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required to update activity registration' });
    }

    const allowedStatuses: Array<'present' | 'absent'> = ['present', 'absent'];
    if (!status || !allowedStatuses.includes(status as 'present' | 'absent')) {
      return res.status(400).json({ message: 'Status must be either "present" or "absent"' });
    }

    const rawActivityId = Array.isArray(activityId) ? activityId[0] : activityId;
    const numericActivityId = Number.parseInt(rawActivityId, 10);
    if (!Number.isFinite(numericActivityId) || numericActivityId < 0) {
      return res.status(400).json({ message: 'Invalid activityId' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updated = await ActivityRegistration.findOneAndUpdate(
      {
        project: project._id,
        activityId: numericActivityId,
        participantEmail: email,
      },
      {
        $set: { status },
        $setOnInsert: { participantEmail: email },
      },
      { new: true, upsert: true },
    ).lean();

    if (!updated) {
      return res.status(500).json({ message: 'Failed to update activity registration' });
    }

    return res.json({
      participantEmail: updated.participantEmail,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error updating activity registration', error);
    return res.status(500).json({ message: 'Failed to update activity registration' });
  }
};

export const deleteActivityRegistration = async (req: Request, res: Response) => {
  try {
    const { id, activityId } = req.params;
    const { email } = req.body as { email?: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required to delete activity registration' });
    }

    const rawActivityId = Array.isArray(activityId) ? activityId[0] : activityId;
    const numericActivityId = Number.parseInt(rawActivityId, 10);
    if (!Number.isFinite(numericActivityId) || numericActivityId < 0) {
      return res.status(400).json({ message: 'Invalid activityId' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const deleted = await ActivityRegistration.findOneAndDelete({
      project: project._id,
      activityId: numericActivityId,
      participantEmail: email,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ message: 'Activity registration not found' });
    }

    return res.json({ message: 'Activity registration removed' });
  } catch (error) {
    console.error('Error deleting activity registration', error);
    return res.status(500).json({ message: 'Failed to delete activity registration' });
  }
};

export const listParticipantActivities = async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.query.email as string | string[] | undefined) ?? '';
    const email = Array.isArray(rawEmail) ? rawEmail[0]?.trim() : rawEmail.trim();

    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required' });
    }

    const registrations = await ActivityRegistration.find({ participantEmail: email })
      .sort({ updatedAt: -1 })
      .lean();

    if (registrations.length === 0) {
      return res.json([]);
    }

    const projectIds = Array.from(new Set(registrations.map((reg) => reg.project.toString())));

    const projects = await Project.find({ _id: { $in: projectIds } })
      .select({ name: 1, proposalData: 1 })
      .lean();

    const projectMap = new Map<string, any>();
    for (const project of projects) {
      projectMap.set(project._id.toString(), project);
    }

    const result = registrations.map((reg) => {
      const projectId = reg.project.toString();
      const project = projectMap.get(projectId);

      let activityTitle = `Activity ${reg.activityId + 1}`;

      try {
        const proposal: any = project?.proposalData;
        const trainingSnapshot = proposal && proposal['training-design'];

        if (trainingSnapshot && Array.isArray(trainingSnapshot.editableCells)) {
          const cells: string[] = trainingSnapshot.editableCells;
          let indexCounter = 0;

          for (let i = 0; i + 1 < cells.length; i += 2) {
            const title = (cells[i] || '').trim();

            if (!title) {
              continue;
            }

            if (indexCounter === reg.activityId) {
              activityTitle = title;
              break;
            }

            indexCounter += 1;
          }
        }
      } catch (parseError) {
        console.error('Failed to derive activity title for listParticipantActivities', parseError);
      }

      return {
        projectId,
        projectName: project?.name ?? 'Unknown project',
        activityId: reg.activityId,
        activityTitle,
        status: reg.status,
        updatedAt: reg.updatedAt ?? reg.createdAt,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Error listing participant activities', error);
    return res.status(500).json({ message: 'Failed to load participant activities' });
  }
};

export const listProjectBeneficiaries = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const docs = await ProjectBeneficiary.find({ project: project._id, status: { $ne: 'removed' } })
      .sort({ createdAt: 1 })
      .lean();

    const result = docs.map((doc) => ({
      email: doc.email,
      status: doc.status,
      joinedAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return res.json(result);
  } catch (error) {
    console.error('Error listing project beneficiaries', error);
    return res.status(500).json({ message: 'Failed to load project beneficiaries' });
  }
};

export const updateProjectBeneficiary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, status } = req.body as { email?: string; status?: string };

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required to update beneficiary' });
    }

    const allowedStatuses: Array<'active' | 'removed'> = ['active', 'removed'];
    if (!status || !allowedStatuses.includes(status as 'active' | 'removed')) {
      return res.status(400).json({ message: 'Status must be either "active" or "removed"' });
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updated = await ProjectBeneficiary.findOneAndUpdate(
      { project: project._id, email },
      { $set: { status } },
      { new: true, upsert: true },
    ).lean();

    if (!updated) {
      return res.status(500).json({ message: 'Failed to update project beneficiary' });
    }

    return res.json({
      email: updated.email,
      status: updated.status,
      joinedAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error updating project beneficiary', error);
    return res.status(500).json({ message: 'Failed to update project beneficiary' });
  }
};
