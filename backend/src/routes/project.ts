import { Router } from 'express';
import { createProject, listProjects, getProject, evaluateProject } from '../controllers/projectController';

const router = Router();

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.patch('/:id/evaluate', evaluateProject);

export default router;
