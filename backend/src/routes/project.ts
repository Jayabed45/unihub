import { Router } from 'express';
import { createProject, listProjects, getProject, evaluateProject, deleteProject } from '../controllers/projectController';

const router = Router();

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.patch('/:id/evaluate', evaluateProject);
router.delete('/:id', deleteProject);

export default router;
