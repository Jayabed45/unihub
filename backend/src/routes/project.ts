import { Router } from 'express';
import { createProject, listProjects, getProject, evaluateProject, deleteProject, requestJoinProject, updateProjectProposal } from '../controllers/projectController';

const router = Router();

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', createProject);
router.patch('/:id/evaluate', evaluateProject);
router.patch('/:id/proposal', updateProjectProposal);
router.post('/:id/join-request', requestJoinProject);
router.delete('/:id', deleteProject);

export default router;
