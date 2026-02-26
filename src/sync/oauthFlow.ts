import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function startOAuthFlow(
  clientId: string,
  clientSecret: string,
  setSetting: (key: string, value: string) => void
): Promise<boolean> {
  const port = await invoke<number>('start_oauth_listener');
  const redirectUri = `http://127.0.0.1:${port}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DRIVE_APPDATA_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });

  await open(`${GOOGLE_AUTH_URL}?${params.toString()}`);

  const code = await invoke<string>('await_oauth_callback');

  const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

  setSetting('google_access_token', tokens.access_token);
  if (tokens.refresh_token) {
    setSetting('google_refresh_token', tokens.refresh_token);
  }
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  setSetting('google_token_expires_at', expiresAt.toString());

  return true;
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<TokenResponse> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return resp.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenResponse> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return resp.json() as Promise<TokenResponse>;
}

export async function getValidAccessToken(
  settings: Map<string, string>,
  setSetting: (key: string, value: string) => void
): Promise<string> {
  const accessToken = settings.get('google_access_token');
  const refreshToken = settings.get('google_refresh_token');
  const clientId = settings.get('google_client_id');
  const clientSecret = settings.get('google_client_secret');
  const expiresAt = settings.get('google_token_expires_at');

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Google Drive not configured');
  }

  // If token is still valid (with 60s buffer), use it
  if (accessToken && expiresAt && Date.now() < parseInt(expiresAt) - 60_000) {
    return accessToken;
  }

  // Refresh the token
  const tokens = await refreshAccessToken(refreshToken, clientId, clientSecret);

  setSetting('google_access_token', tokens.access_token);
  const newExpiresAt = Date.now() + tokens.expires_in * 1000;
  setSetting('google_token_expires_at', newExpiresAt.toString());
  if (tokens.refresh_token) {
    setSetting('google_refresh_token', tokens.refresh_token);
  }

  return tokens.access_token;
}

export function isOAuthConfigured(settings: Map<string, string>): boolean {
  return !!(
    settings.get('google_client_id') &&
    settings.get('google_client_secret') &&
    settings.get('google_refresh_token')
  );
}

export function clearOAuthTokens(setSetting: (key: string, value: string) => void): void {
  setSetting('google_access_token', '');
  setSetting('google_refresh_token', '');
  setSetting('google_token_expires_at', '');
}
