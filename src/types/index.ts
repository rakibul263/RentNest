import { Request } from 'express';

export enum UserRole {
  TENANT = 'tenant',
  LANDLORD = 'landlord',
  ADMIN = 'admin',
}

export enum RentalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  SSLCOMMERZ = 'sslcommerz',
}

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  isBanned: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategory {
  _id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
}

export interface IProperty {
  _id?: string;
  landlord: string;
  title: string;
  description: string;
  category: string;
  price: number;
  location: {
    address: string;
    city: string;
    state?: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRentalRequest {
  _id?: string;
  tenant: string;
  property: string;
  landlord: string;
  status: RentalStatus;
  message?: string;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayment {
  _id?: string;
  tenant: string;
  rentalRequest: string;
  amount: number;
  method: string;
  provider: PaymentProvider;
  transactionId: string;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt?: Date;
}

export interface IReview {
  _id?: string;
  tenant: string;
  property: string;
  rentalRequest: string;
  rating: number;
  comment?: string;
  createdAt?: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorDetails?: any;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
