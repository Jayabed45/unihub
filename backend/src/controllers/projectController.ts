import { Request, Response } from 'express';
import Project from '../models/Project';
import Notification from '../models/Notification';
import User from '../models/User';
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
