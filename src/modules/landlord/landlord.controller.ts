import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../types';
import AppError from '../../utils/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

export const createProperty = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const {
      title,
      description,
      categoryId,
      price,
      address,
      city,
      state,
      zipCode,
      bedrooms,
      bathrooms,
      area,
      amenities,
      images,
    } = req.body;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const property = await prisma.property.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        address,
        city,
        state,
        zipCode,
        bedrooms: parseInt(bedrooms, 10),
        bathrooms: parseInt(bathrooms, 10),
        area: parseFloat(area),
        amenities: amenities || [],
        images: images || [],
        landlordId: req.user!.id,
        categoryId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    sendResponse(res, 201, 'Property created successfully', property);
  }
);

export const updateProperty = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const updateData = req.body;

    const existing = await prisma.property.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.landlordId !== req.user!.id) {
      throw new AppError('You can only update your own properties', 403);
    }

    if (updateData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updateData.categoryId },
      });
      if (!category) {
        throw new AppError('Category not found', 404);
      }
    }

    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.bedrooms)
      updateData.bedrooms = parseInt(updateData.bedrooms, 10);
    if (updateData.bathrooms)
      updateData.bathrooms = parseInt(updateData.bathrooms, 10);
    if (updateData.area) updateData.area = parseFloat(updateData.area);
    if (updateData.isAvailable !== undefined)
      updateData.isAvailable = Boolean(updateData.isAvailable);

    const property = await prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    sendResponse(res, 200, 'Property updated successfully', property);
  }
);

export const deleteProperty = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const existing = await prisma.property.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.landlordId !== req.user!.id) {
      throw new AppError('You can only delete your own properties', 403);
    }

    await prisma.property.delete({ where: { id } });

    sendResponse(res, 200, 'Property deleted successfully');
  }
);

export const getLandlordRequests = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const requests = await prisma.rentalRequest.findMany({
      where: { landlordId: req.user!.id },
      include: {
        tenant: {
          select: { id: true, name: true, email: true, phone: true },
        },
        property: {
          select: { id: true, title: true, price: true, address: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendResponse(
      res,
      200,
      'Rental requests fetched successfully',
      requests
    );
  }
);

export const updateRequestStatus = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status } = req.body;

    const request = await prisma.rentalRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!request) {
      throw new AppError('Rental request not found', 404);
    }

    if (request.property.landlordId !== req.user!.id) {
      throw new AppError(
        'You can only manage requests for your own properties',
        403
      );
    }

    if (request.status !== 'pending') {
      throw new AppError('This request has already been processed', 400);
    }

    const updated = await prisma.rentalRequest.update({
      where: { id },
      data: { status },
      include: {
        tenant: {
          select: { id: true, name: true, email: true },
        },
        property: {
          select: { id: true, title: true },
        },
      },
    });

    sendResponse(
      res,
      200,
      `Rental request ${status} successfully`,
      updated
    );
  }
);
