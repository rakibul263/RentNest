import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../types';
import AppError from '../../utils/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

export const getAllUsers = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isBanned: true,
          createdAt: true,
          _count: {
            select: {
              properties: true,
              rentalRequests: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    sendResponse(res, 200, 'Users fetched successfully', users, {
      page,
      limit,
      total,
    });
  }
);

export const updateUserStatus = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { isBanned } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === 'admin') {
      throw new AppError('Cannot ban/unban an admin', 403);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
      },
    });

    sendResponse(
      res,
      200,
      `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
      updated
    );
  }
);

export const getAllProperties = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        skip,
        take: limit,
        include: {
          landlord: {
            select: { id: true, name: true, email: true },
          },
          category: { select: { id: true, name: true } },
          _count: {
            select: { rentalRequests: true, reviews: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.property.count(),
    ]);

    sendResponse(res, 200, 'Properties fetched successfully', properties, {
      page,
      limit,
      total,
    });
  }
);

export const getAllRentals = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [rentals, total] = await Promise.all([
      prisma.rentalRequest.findMany({
        skip,
        take: limit,
        include: {
          tenant: {
            select: { id: true, name: true, email: true },
          },
          landlord: {
            select: { id: true, name: true, email: true },
          },
          property: {
            select: { id: true, title: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rentalRequest.count(),
    ]);

    sendResponse(res, 200, 'Rental requests fetched successfully', rentals, {
      page,
      limit,
      total,
    });
  }
);

export const createCategory = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      throw new AppError('Category already exists', 400);
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    sendResponse(res, 201, 'Category created successfully', category);
  }
);

export const deleteCategory = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    await prisma.category.delete({ where: { id } });

    sendResponse(res, 200, 'Category deleted successfully');
  }
);
