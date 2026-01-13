import express, { Router } from 'express';
import {
  getAllLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  getLabsJson
} from '../controllers/labController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createLabSchema,
  updateLabSchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', validate(autocompleteQuerySchema, 'query'), getLabsJson);

// Standard REST endpoints
router.get('/', authorize(1, 2), validate(paginationSchema, 'query'), getAllLabs);
router.get('/:id', authorize(1, 2), validate(idParamSchema, 'params'), getLabById);
router.post('/', authorize(1, 2), validate(createLabSchema), createLab);
router.put('/:id', authorize(1, 2), validateRequest({
  params: idParamSchema,
  body: updateLabSchema
}), updateLab);
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteLab);

export default router;
