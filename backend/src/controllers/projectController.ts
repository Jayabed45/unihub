import { Request, Response } from 'express';
import Project from '../models/Project';
import Notification from '../models/Notification';

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

    await Notification.create({
      title: 'New project created',
      message: saved.name,
      project: saved._id,
    });
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

    return res.json(project);
  } catch (error) {
    console.error('Error evaluating project', error);
    return res.status(500).json({ message: 'Failed to evaluate project' });
  }
};
