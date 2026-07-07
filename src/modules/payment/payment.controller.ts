import { Response } from 'express';
import Stripe from 'stripe';
import prisma from '../../config/prisma';
import { AuthRequest, PaymentProvider, PaymentStatus } from '../../types';
import AppError from '../../utils/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createPaymentIntent = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { rentalRequestId } = req.body;

    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: rentalRequestId },
      include: { property: true },
    });

    if (!rentalRequest) {
      throw new AppError('Rental request not found', 404);
    }

    if (rentalRequest.tenantId !== req.user!.id) {
      throw new AppError(
        'You can only pay for your own rental requests',
        403
      );
    }

    if (rentalRequest.status !== 'approved') {
      throw new AppError(
        'Payment is only allowed for approved requests',
        400
      );
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        rentalRequestId,
        status: PaymentStatus.COMPLETED,
      },
    });

    if (existingPayment) {
      throw new AppError('Payment already completed for this request', 400);
    }

    const amountInCents = Math.round(rentalRequest.property.price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        rentalRequestId,
        tenantId: req.user!.id,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        tenantId: req.user!.id,
        rentalRequestId,
        amount: rentalRequest.property.price,
        method: 'card',
        provider: PaymentProvider.STRIPE,
        transactionId: paymentIntent.id,
        status: PaymentStatus.PENDING,
      },
    });

    sendResponse(res, 201, 'Payment intent created', {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amount: rentalRequest.property.price,
    });
  }
);

export const confirmPayment = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { paymentId, transactionId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        rentalRequest: {
          include: { property: true },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.tenantId !== req.user!.id) {
      throw new AppError('You can only confirm your own payments', 403);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError('Payment has already been processed', 400);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      transactionId
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Payment has not been completed', 400);
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionId,
        paidAt: new Date(),
      },
    });

    await prisma.rentalRequest.update({
      where: { id: payment.rentalRequestId },
      data: { status: 'active' },
    });

    sendResponse(res, 200, 'Payment confirmed successfully', updatedPayment);
  }
);

export const getPaymentHistory = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const payments = await prisma.payment.findMany({
      where: { tenantId: req.user!.id },
      include: {
        rentalRequest: {
          include: {
            property: {
              select: { id: true, title: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendResponse(res, 200, 'Payment history fetched', payments);
  }
);

export const getPaymentById = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        rentalRequest: {
          include: {
            property: true,
            landlord: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (
      payment.tenantId !== req.user!.id
    ) {
      throw new AppError('You can only view your own payments', 403);
    }

    sendResponse(res, 200, 'Payment fetched', payment);
  }
);
