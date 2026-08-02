import { FlattenMaps } from 'mongoose';
import { User } from 'src/users/entities/user.entity';
import { Staff } from 'src/staff/entities/staff.entity';

declare global {
  // Extend Express Request interface
  namespace Express {
    export interface Request {
      user: User; // User document
      auth: {
        userId: string;
        deviceId: string;
        tokenJti?: string;
        accessToken?: string; // Auth token
      };
      // Staff realm — populated only by StaffAuthMiddleware on staff/admin-ops
      // routes. Independent of `user`/`auth`.
      staff?: Staff;
      staffAuth?: {
        staffId: string;
        deviceId: string;
        tokenJti?: string;
      };
    }

    //todo: to be done later

    export interface AuthenticatedRequest extends Request {
      auth: {
        userId: string;
        deviceId: string;
        tokenJti: string;
        accessToken?: string; // Auth token
      };
    }
  }
}

// Globals for models
declare global {
  type MongooseId = import('mongoose').Types.ObjectId;
  interface INextFunction {
    (err?: any): void;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages?: number;
}

export type ISortOrder = 'asc' | 'desc';

export interface IQueryParams {
  limit: number;
  page: number;
  sort: ISortOrder;
  lean: boolean;
  query: string;
}

export interface IRegexReturnParams<T> {
  documents: FlattenMaps<T>[];
  totalDocuments: number;
}

export {};
