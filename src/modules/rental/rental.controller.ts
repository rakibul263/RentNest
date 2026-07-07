import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../types';
import AppError from '../../utils/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

export const createRentalRequest = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { propertyId, startDate, endDate, message } = req.body;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    if (!property.isAvailable) {
      throw new AppError('Property is not available', 400);
    }

    if (property.landlordId === req.user!.id) {
      throw new AppError('You cannot rent your own property', 400);
    }

    const existingRequest = await prisma.rentalRequest.findFirst({
      where: {
        tenantId: req.user!.id,
        propertyId,
        status: { in: ['pending', 'approved', 'active'] },
      },
    });

    if (existingRequest) {
      throw new AppError(
        'You already have an active or pending request for this property',
        400
      );
    }

    const rentalRequest = await prisma.rentalRequest.create({
      data: {
        tenantId: req.user!.id,
        propertyId,
        landlordId: property.landlordId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        message,
      },
      include: {
        property: {
          select: { id: true, title: true, price: true },
        },
      },
    });

    sendResponse(
      res,
      201,
      'Rental request submitted successfully',
      rentalRequest
    );
  }
);

export const getMyRentalRequests = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const requests = await prisma.rentalRequest.findMany({
      where: { tenantId: req.user!.id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            address: true,
            city: true,
            images: true,
          },
        },
        landlord: {
          select: { id: true, name: true, email: true, phone: true },
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

export const getRentalRequestById = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        landlord: {
          select: { id: true, name: true, email: true, phone: true },
        },
        payments: true,
      },
    });

    if (!rentalRequest) {
      throw new AppError('Rental request not found', 404);
    }

    if (
      rentalRequest.tenantId !== req.user!.id &&
      rentalRequest.landlordId !== req.user!.id
    ) {
      throw new AppError(
        'You can only view your own rental requests',
        403
      );
    }

    sendResponse(
      res,
      200,
      'Rental request fetched successfully',
      rentalRequest
    );
  }
);
