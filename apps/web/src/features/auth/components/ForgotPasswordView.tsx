'use client';

import { useSearchParams } from 'next/navigation';
import ForgotPasswordRequest from './ForgotPasswordRequest';
import ResetPasswordForm from './ResetPasswordForm';

/*
 * One route, two states, because the API puts this path in the reset email:
 * with `?token=…&email=…` it sets a new password, without them it asks for a
 * link.
 */
export default function ForgotPasswordView() {
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');

  if (token && email) return <ResetPasswordForm token={token} email={email} />;
  return <ForgotPasswordRequest defaultEmail={email ?? ''} />;
}
