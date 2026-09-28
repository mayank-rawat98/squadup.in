'use client';

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import {
  getGoogleClientId,
  preloadGoogleAccounts,
  requestGoogleAuthCode,
} from '@/lib/google/identity-services';
import { signInWithGoogle } from '../api/auth.api';
import { useCompleteSignIn } from '../hooks/use-complete-sign-in';

/*
 * "Continue with Google", on both the register and sign-in pages. The same
 * button creates an account or signs into an existing one, and a 2FA-enabled
 * account continues to the second factor exactly like a password sign-in.
 *
 * Google sign-in is always remembered (`rememberMe: true`), as the API's
 * social sign-in picks the longer refresh window anyway.
 *
 * Without NEXT_PUBLIC_GOOGLE_CLIENT_ID the button isn't rendered at all,
 * rather than offering something that can only fail.
 */

/*
 * Google's "G" in its own brand colours, which its sign-in branding rules
 * require. The one place a hex value is allowed in a component: these are
 * Google's colours, not ours, and must not follow our theme.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

export default function GoogleSignInButton() {
  const clientId = getGoogleClientId();
  const { completeSignIn } = useCompleteSignIn();

  useEffect(() => {
    if (clientId) preloadGoogleAccounts();
  }, [clientId]);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const code = await requestGoogleAuthCode(id);
      return signInWithGoogle({ code, rememberMe: true });
    },
    onSuccess: (response) => completeSignIn(response, true),
    onError: (error: unknown) => {
      if (error === null) return; // the user closed the popup
      toast.error(
        error instanceof Error ? error.message : getErrorMessage(error),
      );
    },
  });

  if (!clientId) return null;

  return (
    <Button
      variant="outline"
      fullWidth
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(clientId)}
    >
      <GoogleMark />
      {mutation.isPending ? 'Connecting to Google…' : 'Continue with Google'}
    </Button>
  );
}
