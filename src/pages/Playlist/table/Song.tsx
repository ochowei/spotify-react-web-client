import { useCallback, useState } from 'react';
import { PlaylistItemWithSaved } from '../../../interfaces/playlists';
import SongView, { SongViewComponents } from '../../../components/SongsTable/songView';
import { msToTime } from '../../../utils';
import { Modal, Input, InputNumber } from 'antd';
import { FaGear } from 'react-icons/fa6';

// Redux
import { playlistActions } from '../../../store/slices/playlist';
import { useAppDispatch, useAppSelector } from '../../../store/store';

interface SongProps {
  index: number;
  song: PlaylistItemWithSaved;
  extendedTracks: Set<string>;
}

export const Song = (props: SongProps) => {
  const { song, index, extendedTracks } = props;

  const dispatch = useAppDispatch();
  const view = useAppSelector((state) => state.playlist.view);
  const canEdit = useAppSelector((state) => state.playlist.canEdit);
  const playlist = useAppSelector((state) => state.playlist.playlist);

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [seconds, setSeconds] = useState<number | null>(null);

  const toggleLike = useCallback(() => {
    dispatch(playlistActions.setTrackLikeState({ id: song.track.id, saved: !song.saved }));
  }, [dispatch, song.saved, song.track.id]);

  return (
    <SongView
      activable
      view={view}
      index={index}
      canEdit={canEdit}
      song={song.track}
      saved={song.saved}
      playlist={playlist}
      addedAt={song.added_at}
      onToggleLike={toggleLike}
      context={{
        context_uri: playlist?.uri,
        offset: { position: index },
      }}
      fields={[
        SongViewComponents.TitleWithCover,
        SongViewComponents.Artists,
        SongViewComponents.Album,
        SongViewComponents.AddedAt,
        (props) => <SongViewComponents.AddToLiked {...props} onLikeRefresh={toggleLike} />,
        (props) => {
          const duration = extendedTracks.has(props.song.name)
            ? '0:50'
            : msToTime(props.song.duration_ms);
          return (
            <>
              <p
                className='text-right '
                style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'end',
                  alignItems: 'center',
                }}
              >
                {duration}
                <button className='ml-2' onClick={() => setOpen(true)} aria-label='設定'>
                  <FaGear size={12} />
                </button>
              </p>
              <Modal
                open={open}
                onOk={() => setOpen(false)}
                onCancel={() => setOpen(false)}
                title='設定播放時間'
              >
                <Input
                  placeholder='開始時間'
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className='mb-2'
                />
                <InputNumber
                  placeholder='秒數'
                  value={seconds ?? undefined}
                  onChange={(value) =>
                    setSeconds(typeof value === 'number' ? value : null)
                  }
                  style={{ width: '100%' }}
                />
              </Modal>
            </>
          );
        },
        SongViewComponents.Actions,
      ]}
    />
  );
};

export default Song;
