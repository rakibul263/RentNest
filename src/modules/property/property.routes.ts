import { Router } from 'express';
import {
  getAllProperties,
  getPropertyById,
  getAllCategories,
} from './property.controller';

const router = Router();

router.get('/', getAllProperties);
router.get('/:id', getPropertyById);

export default router;
