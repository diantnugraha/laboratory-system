import express, { Router } from 'express';
import { pingSimlab } from '../controllers/pingController';

const router: Router = express.Router();

// Health check to DB simlab_dev (public, no auth needed)
router.get('/ping', pingSimlab);

export default router;














