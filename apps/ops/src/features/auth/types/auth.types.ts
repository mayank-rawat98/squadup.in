import type { SessionTokens } from '@/lib/auth';

export type StaffStatus = 'active' | 'suspended';

/** The signed-in staff member, from `GET /staff/me`. */
export interface CurrentStaff {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: StaffStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

/** `POST /staff/auth/login`. The refresh token arrives as a cookie instead. */
export interface StaffSignInResponse extends SessionTokens {
  staff: CurrentStaff;
}
