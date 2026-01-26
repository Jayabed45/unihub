import { Router } from 'express';
import { getPresence } from '../controllers/presenceController';

const router = Router();

router.get('/', getPresence);

export default router;
