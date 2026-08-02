import { FlattenMaps } from 'mongoose';
import { ISortOrder } from '.';
interface RangeFilter<T> {
  $gte?: T;
  $lte?: T;
}

export type GFilterParams<T> = {
  [P in keyof T]?: T[P] extends string
    ? string | RegExp | undefined
    : T[P] extends number
      ? number | RangeFilter<number> | undefined
      : T[P] extends boolean
        ? boolean | undefined
        : T[P] extends Date
          ? RangeFilter<Date> | undefined
          : unknown;
};

export interface GQueryParams {
  limit: number;
  page: number;
  sort: ISortOrder;
  lean: boolean;
  query: string;
  sortby: string;
}

export interface GPaginationReturnParams<T> {
  documents: FlattenMaps<T>[];
  totalDocuments: number;
  paginationParams: GQueryParams;
}
