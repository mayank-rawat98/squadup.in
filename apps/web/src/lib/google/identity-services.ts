/*
 * Google Identity Services, loaded on demand and only once. We use the popup
 * "code client": Google hands back a one-time authorization code, and the API
 * exchanges it (with `redirect_uri: 'postmessage'`) for the user's identity.
 * No Google token ever reaches this app.
 *
 * Only the few calls we make are typed here, rather than pulling in a types
 * package for them.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface CodeResponse {
  code?: string;
  error?: string;
  error_description?: string;
}

interface CodeClient {
  requestCode(): void;
}

interface CodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode: 'popup';
  callback: (response: CodeResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
}

interface GoogleAccounts {
  oauth2: {
    initCodeClient(config: CodeClientConfig): CodeClient;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

let loading: Promise<GoogleAccounts> | null = null;

export function getGoogleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null;
}

function loadGoogleAccounts(): Promise<GoogleAccounts> {
  if (window.google?.accounts) return Promise.resolve(window.google.accounts);

  loading ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () =>
      window.google?.accounts
        ? resolve(window.google.accounts)
        : reject(new Error('Google sign-in did not load.'));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Google sign-in could not be loaded.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Starts loading the script early, e.g. when the button first renders. */
export function preloadGoogleAccounts(): void {
  loadGoogleAccounts().catch(() => undefined);
}

/**
 * Opens Google's popup and resolves with the authorization code. Rejects with
 * `null` when the user closes the popup, so callers can stay quiet about it.
 */
export async function requestGoogleAuthCode(clientId: string): Promise<string> {
  const accounts = await loadGoogleAccounts();
  return new Promise<string>((resolve, reject) => {
    const client = accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response) =>
        response.code
          ? resolve(response.code)
          : reject(
              new Error(
                response.error_description ?? 'Google sign-in was cancelled.',
              ),
            ),
      error_callback: (error) =>
        reject(error.type === 'popup_closed' ? null : new Error(error.message)),
    });
    client.requestCode();
  });
}
