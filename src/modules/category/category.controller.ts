import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

export const getAllCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    sendResponse(res, 200, 'Categories fetched successfully', categories);
  }
);
