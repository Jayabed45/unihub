import { Router } from 'express';
import {
  createProject,
  deleteProject,
  evaluateProject,
  listProjects,
  getProject,
  requestJoinProject,
  respondToJoinRequest,
  joinActivity,
  listActivityRegistrations,
  updateActivityRegistration,
  deleteActivityRegistration,
  listParticipantActivities,
  listProjectBeneficiaries,
  updateProjectBeneficiary,
} from '../controllers/projectController';

const router = Router();

router.get('/', listProjects);
router.post('/', createProject);
router.get('/participant-activities', listParticipantActivities);
router.get('/:id', getProject);
router.get('/:id/beneficiaries', listProjectBeneficiaries);
router.patch('/:id/beneficiaries', updateProjectBeneficiary);
router.patch('/:id/evaluate', evaluateProject);
router.delete('/:id', deleteProject);
router.post('/:id/join', requestJoinProject);
router.post('/:id/join/respond', respondToJoinRequest);
router.post('/:id/activities/:activityId/join', joinActivity);
router.get('/:id/activities/:activityId/registrations', listActivityRegistrations);
router.patch('/:id/activities/:activityId/registrations', updateActivityRegistration);
router.delete('/:id/activities/:activityId/registrations', deleteActivityRegistration);

export default router;
