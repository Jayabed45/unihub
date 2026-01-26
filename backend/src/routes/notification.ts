import { Router } from 'express';
import {
  listNotifications,
  listJoinRequestsForLeader,
  updateJoinRequestStatus,
  listJoinRequestsForParticipant,
  markNotificationRead,
} from '../controllers/notificationController';

const router = Router();

router.get('/', listNotifications);
router.get('/join-requests', listJoinRequestsForLeader);
router.get('/join-requests/participant', listJoinRequestsForParticipant);
router.patch('/join-requests/:id', updateJoinRequestStatus);
router.patch('/:id/read', markNotificationRead);

export default router;
