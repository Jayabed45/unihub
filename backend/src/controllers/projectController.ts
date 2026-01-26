import { Request, Response } from 'express';
import Project from '../models/Project';
import Notification from '../models/Notification';
import User from '../models/User';
import Role from '../models/Role';
import { notifyAdminNewNotifications, notifyUserNewNotifications, notifyParticipantsProjectsRefresh } from '../socket';

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
      console.error('Failed to look up project leader for creation notification', lookupError);
    }

    const message = leaderEmail ? `${leaderEmail} create a project` : saved.name;

    await Notification.create({
      title: 'New project created',
      message,
      project: saved._id,
    });
    // Notify admins about the new project
    notifyAdminNewNotifications();

    // Also notify all participants about the new (pending) project and refresh their Feeds in real time
    try {
      const participantRole = await Role.findOne({ name: 'Participant' }).lean();
      if (participantRole?._id) {
        const participants = await User.find({ role: participantRole._id }).select('_id').lean();
        for (const p of participants) {
          const participantId = p._id ? String(p._id) : undefined;
          if (!participantId) continue;

          await Notification.create({
            title: 'New project created',
            message: 'A new project has been created and is pending approval.',
            project: saved._id,
            recipient: participantId as any,
          });

          notifyUserNewNotifications(participantId);
        }
      }
    } catch (participantNotifyError) {
      console.error('Failed to notify participants about new project creation', participantNotifyError);
    }

    notifyParticipantsProjectsRefresh();

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

    try {
      if (status && project.projectLeader) {
        const title =
          status === 'Approved'
            ? 'Project approved'
            : status === 'Rejected'
            ? 'Project rejected'
            : 'Project evaluated';

        const message =
          status === 'Approved'
            ? 'Admin approved your project'
            : project.name || 'Your project has been evaluated';

        await Notification.create({
          title,
          message,
          project: project._id,
          recipient: project.projectLeader as any,
        });

        notifyUserNewNotifications(String(project.projectLeader));
      }

      // When a project is approved by admin, broadcast a join invite notification to all participants
      if (status === 'Approved') {
        try {
          const participantRole = await Role.findOne({ name: 'Participant' }).lean();
          if (participantRole?._id) {
            const participants = await User.find({ role: participantRole._id }).select('_id').lean();
            for (const p of participants) {
              const participantId = p._id ? String(p._id) : undefined;
              if (!participantId) continue;

              await Notification.create({
                title: 'Project approved',
                message: 'Newly approved project, wants to join?',
                project: project._id,
                recipient: participantId as any,
              });

              notifyUserNewNotifications(participantId);
            }
          }
        } catch (participantNotifyError) {
          console.error('Failed to notify participants about newly approved project', participantNotifyError);
        }
      }
    } catch (notifyError) {
      console.error('Failed to create evaluation notification', notifyError);
    }

    // Notify all participants that project listings may have changed (e.g., new approvals)
    notifyParticipantsProjectsRefresh();

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
    const { participantId } = req.body as { participantId?: string };

    const project = await Project.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.projectLeader) {
      return res.status(400).json({ message: 'Project has no assigned leader' });
    }

    try {
      const baseMessage = project.name || 'A participant requested to join your project';

      let requesterEmail: string | undefined;
      if (participantId) {
        try {
          const requester = await User.findById(participantId).lean();
          requesterEmail = requester?.email;
        } catch (lookupError) {
          console.error('Failed to look up participant for join request notification', lookupError);
        }
      }

      const message = requesterEmail
        ? `${requesterEmail} wants to join the project`
        : baseMessage;

      await Notification.create({
        title: 'Join request received',
        message,
        project: project._id,
        recipient: project.projectLeader as any,
        requester: participantId ? (participantId as any) : undefined,
        joinStatus: 'Requested',
      });
      notifyUserNewNotifications(project.projectLeader ? String(project.projectLeader) : undefined);
    } catch (notifyError) {
      console.error('Failed to create join request notification', notifyError);
    }

    return res.status(201).json({ message: 'Join request sent' });
  } catch (error) {
    console.error('Error handling join request', error);
    return res.status(500).json({ message: 'Failed to send join request' });
  }
};

export const updateProjectProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { proposalData, name, totals, updaterId, updaterRole } = req.body as {
      proposalData?: any;
      name?: string;
      totals?: Record<string, any>;
      updaterId?: string;
      updaterRole?: string;
    };

    if (!proposalData || typeof proposalData !== 'object') {
      return res.status(400).json({ message: 'proposalData is required' });
    }

    const update: Record<string, any> = {
      proposalData,
    };

    if (typeof name === 'string' && name.trim()) {
      update.name = name.trim();
    }

    if (totals && typeof totals === 'object') {
      update.summary = totals;
    }

    const project = await Project.findByIdAndUpdate(id, update, { new: true }).lean();

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    try {
      const normalizedUpdaterRole = typeof updaterRole === 'string' ? updaterRole : undefined;
      const normalizedUpdaterId = typeof updaterId === 'string' ? updaterId : undefined;

      const isParticipantUpdate = normalizedUpdaterRole === 'Participant' && !!normalizedUpdaterId;

      if (isParticipantUpdate) {
        // Participant updated the proposal:
        // 1) Notify only the project leader (with participant email)
        // 2) Create a hidden notification for the participant so Feeds can show "You updated this project"

        let participantEmail: string | undefined;
        try {
          const participant = await User.findById(normalizedUpdaterId).lean();
          participantEmail = participant?.email;
        } catch (lookupError) {
          console.error('Failed to look up participant for project update notification', lookupError);
        }

        if (project.projectLeader) {
          await Notification.create({
            title: 'Project updated by participant',
            message: participantEmail
              ? `${participantEmail} updated the project proposal`
              : 'A participant updated the project proposal',
            project: project._id,
            recipient: project.projectLeader as any,
            requester: normalizedUpdaterId as any,
            showInPanel: true,
          });

          notifyUserNewNotifications(String(project.projectLeader));
        }

        // Hidden self-notification for feeds timeline only (no bell ping)
        await Notification.create({
          title: 'Project updated',
          message: 'You updated this project',
          project: project._id,
          recipient: normalizedUpdaterId as any,
          requester: normalizedUpdaterId as any,
          showInPanel: false,
        });
      } else {
        // Leader (or system) updated the project: notify all participants who requested/joined
        let leaderEmail: string | undefined;
        try {
          if (project.projectLeader) {
            const leader = await User.findById(project.projectLeader).lean();
            leaderEmail = leader?.email;
          }
        } catch (lookupError) {
          console.error('Failed to look up leader for project update notification', lookupError);
        }

        // Find participants who have requested or joined this project via join-request notifications
        const joinNotifications = await Notification.find({
          project: project._id,
          title: 'Join request received',
          requester: { $exists: true },
        })
          .select('requester')
          .lean();

        const seen = new Set<string>();
        for (const n of joinNotifications) {
          const participantId = (n as any).requester ? String((n as any).requester) : undefined;
          if (!participantId || seen.has(participantId)) continue;
          seen.add(participantId);

          const message = leaderEmail
            ? `${leaderEmail} updated this project`
            : project.name || 'A project you joined was updated';

          await Notification.create({
            title: 'Project updated',
            message,
            project: project._id,
            recipient: participantId as any,
            requester: project.projectLeader ? (project.projectLeader as any) : undefined,
          });

          notifyUserNewNotifications(participantId);
        }
      }
    } catch (notifyError) {
      console.error('Failed to create project updated notifications for participants/leader', notifyError);
    }

    // Notify all participants that project details have been updated by the leader (feeds / project lists)
    notifyParticipantsProjectsRefresh();

    return res.json(project);
  } catch (error) {
    console.error('Error updating project proposal', error);
    return res.status(500).json({ message: 'Failed to update project proposal' });
  }
};
