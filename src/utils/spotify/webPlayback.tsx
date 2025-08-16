/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, FC, memo, useCallback } from 'react';
import { useAppDispatch } from '../../store/store';
import { spotifyActions } from '../../store/slices/spotify';
import { playerService } from '../../services/player';
import { tracksService } from '../../services/tracks';
import { timeToMs } from '../../utils';

export interface WebPlaybackProps {
  onPlayerError: (message: string) => void; // Función para manejar errores del reproductor
  onPlayerRequestAccessToken: () => Promise<string>; // Función para obtener el token de acceso
  onPlayerLoading: () => void; // Notificación de que el reproductor está cargando
  onPlayerWaitingForDevice: (data: any) => void; // Notificación de que el reproductor espera el dispositivo
  onPlayerDeviceSelected: () => void; // Notificación de que se ha seleccionado el dispositivo
  playerName: string; // Nombre del reproductor
  playerInitialVolume: number; // Volumen inicial del reproductor (0 a 1)
  playerRefreshRateMs?: number; // Frecuencia de actualización del estado del reproductor en ms
  playerAutoConnect?: boolean; // Si el reproductor se conecta automáticamente o no
  children?: any; // Elementos hijos para renderizar dentro del componente
}

const WebPlayback: FC<WebPlaybackProps> = memo((props) => {
  const dispatch = useAppDispatch();

  const { playerName, playerInitialVolume } = props;
  const { playerRefreshRateMs, playerAutoConnect, children } = props;
  const { onPlayerWaitingForDevice, onPlayerDeviceSelected } = props;
  const { onPlayerError, onPlayerLoading, onPlayerRequestAccessToken } = props;

  const webPlaybackInstance = useRef<Spotify.Player | null>(null);
  const statePollingInterval = useRef<NodeJS.Timeout | null>(null);
  const deviceSelectedInterval = useRef<NodeJS.Timeout | null>(null);
  const trackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const extendedTimeoutTracksRef = useRef<
    Map<string, { start: string; duration: number }>
  >(new Map());

  useEffect(() => {
    tracksService
      .getTrackTimeout()
      .then(
        (
          tracks: { name: string; start: string; duration: number }[],
        ) => {
          const map = new Map<string, { start: string; duration: number }>();
          tracks.forEach((t) => {
            map.set(t.name, { start: t.start, duration: t.duration });
          });
          extendedTimeoutTracksRef.current = map;
        },
      )
      .catch((err) => {
        console.error('Failed to load track timeout data', err);
      });
  }, []);

  const handleState = async (state: any | null) => {
    if (state) {
      dispatch(spotifyActions.setState({ state }));

      if (state.paused) {
        if (trackTimeoutRef.current) {
          clearTimeout(trackTimeoutRef.current);
          trackTimeoutRef.current = null;
        }
      } else {
        const newTrackId = state.track_window?.current_track?.id;
        const trackName = state.track_window?.current_track?.name;

        if (
          newTrackId &&
          (currentTrackIdRef.current !== newTrackId || !trackTimeoutRef.current)
        ) {
          if (trackTimeoutRef.current) {
            clearTimeout(trackTimeoutRef.current);
          }

          const trackInfo =
            trackName && extendedTimeoutTracksRef.current.get(trackName);
          if (trackInfo) {
            const startMs = timeToMs(trackInfo.start);
            if (startMs > 0) {
              playerService.seekToPosition(startMs);
            }
            trackTimeoutRef.current = setTimeout(() => {
              playerService.nextTrack();
            }, trackInfo.duration * 1000);
          } else {
            trackTimeoutRef.current = null;
          }

          currentTrackIdRef.current = newTrackId;
        }
      }
    } else {
      clearStatePolling();
      await waitForDeviceToBeSelected();
    }
  };

  const waitForSpotify = useCallback(() => {
    return new Promise<void>((resolve) => {
      if ('Spotify' in window) {
        resolve();
      } else {
        // @ts-ignore
        window.onSpotifyWebPlaybackSDKReady = () => {
          resolve();
        };
      }
    });
  }, []);

  const waitForDeviceToBeSelected = () => {
    return new Promise((resolve) => {
      deviceSelectedInterval.current = setInterval(() => {
        if (webPlaybackInstance.current) {
          webPlaybackInstance.current.getCurrentState().then((state) => {
            if (state !== null) {
              startStatePolling();
              clearInterval(deviceSelectedInterval.current!);
              resolve(state);
            }
          });
        }
      });
    });
  };

  const startStatePolling = useCallback(() => {
    statePollingInterval.current = setInterval(async () => {
      const state = await webPlaybackInstance.current!.getCurrentState();
      await handleState(state);
    }, playerRefreshRateMs || 1000);
  }, [playerRefreshRateMs]);

  const clearStatePolling = useCallback(() => {
    if (statePollingInterval.current) clearInterval(statePollingInterval.current);
  }, []);

  const setupWebPlaybackEvents = useCallback(async () => {
    let { Player } = window.Spotify;
    webPlaybackInstance.current = new Player({
      name: playerName,
      enableMediaSession: true,
      volume: playerInitialVolume,
      getOAuthToken: async (callback) => {
        const userAccessToken = await onPlayerRequestAccessToken();
        callback(userAccessToken);
      },
    });

    webPlaybackInstance.current.on('initialization_error', (e) => {
      console.log('initialization_error', e);
      onPlayerError(e.message);
    });

    webPlaybackInstance.current.on('authentication_error', (e) => {
      console.log('authentication_error', e);
      onPlayerError(e.message);
    });

    webPlaybackInstance.current.on('account_error', (e) => {
      console.log('account_error', e);
      onPlayerError(e.message);
    });

    webPlaybackInstance.current.on('playback_error', (e) => {
      console.log('playback_error', e);
      onPlayerError(e.message);
    });

    webPlaybackInstance.current.on('player_state_changed', async (state) => {
      console.log(state);
      await handleState(state);
    });

    webPlaybackInstance.current.on('ready', async (data) => {
      dispatch(spotifyActions.setDeviceId({ deviceId: data.device_id }));
      dispatch(spotifyActions.setActiveDevice({ activeDevice: data.device_id }));
      await playerService.transferPlayback(data.device_id);
    });

    if (playerAutoConnect) {
      webPlaybackInstance.current.connect();
      dispatch(spotifyActions.setPlayer({ player: webPlaybackInstance.current }));
    }
  }, [
    playerName,
    playerInitialVolume,
    playerAutoConnect,
    onPlayerRequestAccessToken,
    onPlayerError,
    handleState,
    dispatch,
  ]);

  const setupWaitingForDevice = useCallback(() => {
    return new Promise((resolve) => {
      webPlaybackInstance.current!.on('ready', (data) => {
        resolve(data);
      });
    });
  }, []);

  useEffect(() => {
    const initializePlayer = async () => {
      onPlayerLoading();
      await waitForSpotify();
      await setupWebPlaybackEvents();
      const device_data = await setupWaitingForDevice();
      onPlayerWaitingForDevice(device_data);
      await waitForDeviceToBeSelected();
      onPlayerDeviceSelected();
    };

    initializePlayer();

    return () => {
      clearStatePolling();
      if (deviceSelectedInterval.current) clearInterval(deviceSelectedInterval.current);
      if (trackTimeoutRef.current) clearTimeout(trackTimeoutRef.current);
      webPlaybackInstance.current?.disconnect();
    };
  }, []);

  return <>{children}</>;
});

export default WebPlayback;
