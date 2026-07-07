import { Router } from 'express';
import { getAllProperties, getPropertyById } from './controllers';
import { listPropertiesValidation } from './property.validation';
import validate from '../../middleware/validate';

const router = Router();

router.get('/', listPropertiesValidation, validate, getAllProperties);
router.get('/:id', getPropertyById);

export default router;
