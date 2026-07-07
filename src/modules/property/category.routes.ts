import { Router } from 'express';
import { getAllCategories } from './property.controller';

const router = Router();

router.get('/', getAllCategories);

export default router;
