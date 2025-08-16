import { getFromLocalStorageWithExpiry } from '../utils/localstorage';

export const tracksService = {
  getTrackTimeout: async (playlistId?: string) => {
    const access_token = getFromLocalStorageWithExpiry('access_token') as string;
    let url = '/api/tracks/v2/track_timeout';
    if (playlistId) {
      url += `?playlistId=${playlistId}`;
    }
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    return response.json();
  },
};
