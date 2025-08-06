import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NowPlayingLayout } from '../layout';
import { useAppSelector } from '../../../../../store/store';

import QueueSongDetailsProps from './SongDetails';

const NowPlaying = ({ extendedTracks }: { extendedTracks: string[] }) => {
  const [t] = useTranslation(['playingBar']);
  const song = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );
  if (!song) return null;

  return (
    <div>
      <p className='playing-section-title'>{t('Now playing')}</p>
      <div style={{ margin: 5 }}>
        <QueueSongDetailsProps song={song} isPlaying={true} extendedTracks={extendedTracks} />
      </div>
    </div>
  );
};

const Queueing = ({ extendedTracks }: { extendedTracks: string[] }) => {
  const [t] = useTranslation(['playingBar']);
  const queue = useAppSelector((state) => state.queue.queue);

  if (!queue || !queue.length) return null;

  return (
    <div style={{ marginTop: 30 }}>
      <p className='playing-section-title'>{t('Next')}</p>

      <div style={{ margin: 5 }}>
        {queue.map((q, index) => (
          <QueueSongDetailsProps key={index} song={q} extendedTracks={extendedTracks} />
        ))}
      </div>
    </div>
  );
};

export const Queue = () => {
  const [t] = useTranslation(['playingBar']);
  const [extendedTracks, setExtendedTracks] = useState<string[]>([]);

  useEffect(() => {
    fetch(
      'https://gist.githubusercontent.com/ochowei/8bbdfea9e0eff3fb6762218796119b7d/raw/069d2d270e8ca096fabc2dc530760374043bc7d4/extendedTimeoutTracks.json',
    )
      .then((res) => res.json())
      .then((tracks: string[]) => setExtendedTracks(tracks))
      .catch((err) => {
        console.error('Failed to load extended timeout tracks', err);
      });
  }, []);

  return (
    <NowPlayingLayout title={t('Queue')}>
      <div style={{ marginTop: 20 }}>
        <NowPlaying extendedTracks={extendedTracks} />
        <Queueing extendedTracks={extendedTracks} />
      </div>
    </NowPlayingLayout>
  );
};
