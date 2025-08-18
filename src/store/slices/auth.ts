import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Utils
import axios from '../../axios';
import login from '../../utils/spotify/login';
import { log, LogLevel } from '../../utils/logger';

// Services
import { authService } from '../../services/auth';

// Interfaces
import type { User } from '../../interfaces/user';
import { getFromLocalStorageWithExpiry } from '../../utils/localstorage';
import type { AppDispatch } from '../store';

const initialState: { token?: string; playerLoaded: boolean; user?: User; requesting: boolean } = {
  user: undefined,
  requesting: false,
  playerLoaded: false,
  token: getFromLocalStorageWithExpiry('access_token') || undefined,
};

export const loginToSpotify = createAsyncThunk<
  { token?: string; loaded: boolean },
  boolean,
  { dispatch: AppDispatch }
>(
  'auth/loginToSpotify',
  async (anonymous, api) => {
    log('loginToSpotify thunk started', LogLevel.INFO, { anonymous });
    const userToken: string | undefined = getFromLocalStorageWithExpiry('access_token') as string;
    const anonymousToken: string | undefined = getFromLocalStorageWithExpiry('public_access_token');
    log('Initial token check', LogLevel.INFO, {
      hasUserToken: !!userToken,
      hasAnonymousToken: !!anonymousToken,
    });

    let token = userToken || anonymousToken;

    if (token) {
      log('Token found in local storage', LogLevel.INFO, { tokenType: userToken ? 'user' : 'anonymous' });
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      if (userToken) {
        log('Dispatching fetchUser for existing user token');
        api.dispatch(fetchUser());
      }
      initRefreshTokenTimer(api.dispatch);
      return { token, loaded: false };
    }

    log('No token in local storage, calling login.getToken()');
    let [requestedToken, requestUser] = await login.getToken();
    log('login.getToken() returned', LogLevel.INFO, {
      hasRequestedToken: !!requestedToken,
      requestUser,
    });

    if (requestUser) {
      log('Dispatching fetchUser for new user token');
      api.dispatch(fetchUser());
    }

    if (!requestedToken) {
      log('No token returned, redirecting to Spotify login');
      login.logInWithSpotify(anonymous);
    } else {
      log('Token obtained, setting auth header');
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + requestedToken;
      initRefreshTokenTimer(api.dispatch);
    }

    return { token: requestedToken, loaded: true };
  }
);

export const fetchUser = createAsyncThunk('auth/fetchUser', async () => {
  log('fetchUser thunk started');
  try {
    const response = await authService.fetchUser();
    log('fetchUser succeeded', LogLevel.INFO, { userId: response.data.id });
    return response.data;
  } catch (error: any) {
    log('fetchUser failed', LogLevel.ERROR, { error: error.message });
    throw error;
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  clearRefreshTokenTimer();
  localStorage.removeItem('access_token');
  localStorage.removeItem('public_access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('code_verifier');
  delete axios.defaults.headers.common['Authorization'];
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRequesting(state, action: PayloadAction<{ requesting: boolean }>) {
      state.requesting = action.payload.requesting;
    },
    setToken(state, action: PayloadAction<{ token?: string }>) {
      state.token = action.payload.token;
    },
    setPlayerLoaded(state, action: PayloadAction<{ playerLoaded: boolean }>) {
      state.playerLoaded = action.payload.playerLoaded;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginToSpotify.fulfilled, (state, action) => {
      state.token = action.payload.token;
      state.requesting = !action.payload.loaded;
    });
    builder.addCase(fetchUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.requesting = false;
    });
    builder.addCase(logout.fulfilled, (state) => {
      state.token = undefined;
      state.user = undefined;
      state.playerLoaded = false;
      state.requesting = false;
    });
  },
});

export const authActions = { ...authSlice.actions, loginToSpotify, fetchUser, logout };

let refreshTokenTimeout: ReturnType<typeof setTimeout> | undefined;

function scheduleRefreshToken(expiresIn: number, dispatch: AppDispatch) {
  if (refreshTokenTimeout) clearTimeout(refreshTokenTimeout);
  const refreshTime = Math.max(expiresIn * 1000 - 60 * 1000, 0);
  refreshTokenTimeout = setTimeout(async () => {
    const data = await login.getRefreshToken();
    if (data?.access_token && data?.expires_in) {
      dispatch(authActions.setToken({ token: data.access_token }));
      scheduleRefreshToken(data.expires_in, dispatch);
    }
  }, refreshTime);
}

export function initRefreshTokenTimer(dispatch: AppDispatch) {
  const stored = localStorage.getItem('access_token');
  const hasRefresh = localStorage.getItem('refresh_token');
  if (!stored || !hasRefresh) return;
  try {
    const { expiry } = JSON.parse(stored);
    const expiresIn = Math.floor((expiry - Date.now()) / 1000);
    if (expiresIn > 0) scheduleRefreshToken(expiresIn, dispatch);
  } catch {
    // ignore parse errors
  }
}

export function clearRefreshTokenTimer() {
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
    refreshTokenTimeout = undefined;
  }
}

export default authSlice.reducer;
