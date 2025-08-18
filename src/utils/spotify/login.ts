import Axios from 'axios';
import { getFromLocalStorageWithExpiry, setLocalStorageWithExpiry } from '../localstorage';
import axios from 'axios';
import { log, LogLevel } from '../logger';

/* eslint-disable import/no-anonymous-default-export */
const client_id = process.env.REACT_APP_SPOTIFY_CLIENT_ID as string;
const redirect_uri = process.env.REACT_APP_SPOTIFY_REDIRECT_URL as string;

const authUrl = new URL('https://accounts.spotify.com/authorize');

const SCOPES = [
  'ugc-image-upload',
  'streaming',

  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',

  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-collaborative',

  'user-follow-modify',
  'user-follow-read',

  'user-read-playback-position',
  'user-top-read',
  'user-read-recently-played',

  'user-library-read',
  'user-library-modify',
] as const;

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer) => {
  // @ts-ignore
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const logInWithSpotify = async (anonymous?: boolean) => {
  let codeVerifier = localStorage.getItem('code_verifier');

  if (!codeVerifier) {
    codeVerifier = generateRandomString(64);
    localStorage.setItem('code_verifier', codeVerifier);
  }

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  authUrl.search = new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: 'code',
    scope: anonymous ? '' : SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  }).toString();
  window.location.href = authUrl.toString();
};

const requestToken = async (code: string) => {
  log('Requesting token with code');
  const code_verifier = localStorage.getItem('code_verifier') as string;

  const body = {
    code,
    client_id,
    redirect_uri,
    code_verifier,
    grant_type: 'authorization_code',
  };

  try {
    const { data: response } = await Axios.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
    }>('https://accounts.spotify.com/api/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.access_token) {
      log('Token successfully requested', LogLevel.INFO, { hasRefreshToken: !!response.refresh_token });
      setLocalStorageWithExpiry('access_token', response.access_token, response.expires_in * 1000);
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + response.access_token;
      localStorage.setItem('refresh_token', response.refresh_token);
    } else {
      log('Token request response did not contain access_token', LogLevel.WARN);
    }

    return response.access_token;
  } catch (error: any) {
    log('requestToken failed', LogLevel.ERROR, { error: error.message });
    throw error;
  }
};

const getToken = async () => {
  log('getToken started');
  const token = getFromLocalStorageWithExpiry('access_token');
  if (token) {
    log('Found access_token in local storage');
    return [token, true];
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code') as string;
  if (code) {
    log('Found "code" in URL params, requesting token', LogLevel.INFO, { code });
    return [await requestToken(code), true];
  }

  const publicToken = getFromLocalStorageWithExpiry('public_access_token');
  if (publicToken) {
    log('Found public_access_token in local storage');
    return [publicToken, false];
  }

  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  if (accessToken) {
    log('Found access_token in URL hash');
    setLocalStorageWithExpiry('public_access_token', accessToken, 3600 * 1000);
    window.location.hash = '';
    return [accessToken, false];
  }

  log('No token found in any location');
  return [null, false];
};

export const getRefreshToken = async () => {
  // refresh token that has been previously stored
  const refreshToken = localStorage.getItem('refresh_token') as string;

  if (!refreshToken) {
    logInWithSpotify();
    return null;
  }

  const url = 'https://accounts.spotify.com/api/token';

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  };
  const body = await fetch(url, payload);
  const response = await body.json();

  if (!response.access_token) {
    logInWithSpotify();
    return null;
  }

  setLocalStorageWithExpiry('access_token', response.access_token, response.expires_in * 1000);
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + response.access_token;
  if (response.refresh_token) {
    localStorage.setItem('refresh_token', response.refresh_token);
  }
  return { access_token: response.access_token, expires_in: response.expires_in };
};

export default { logInWithSpotify, getToken, getRefreshToken };
