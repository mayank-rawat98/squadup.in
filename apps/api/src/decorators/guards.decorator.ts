import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './constants/decorators.constant';

/** Marks a route as reachable without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
