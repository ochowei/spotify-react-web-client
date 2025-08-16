import { useState, useEffect } from 'react';
import {
  ConfigProvider,
  Modal,
  InputNumber,
  theme,
  Switch,
  Select,
} from 'antd';
import { FaGear } from 'react-icons/fa6';
import { msToTime, timeToMs } from '../../../utils';
import { type Track } from '../../../interfaces/track';

interface TrackTimeSettingsProps {
  song: Track;
  extendedTracks: Map<string, { start: string; duration: number }>;
  onSave: (
    songId: string,
    songName: string,
    settings: { start: string; duration: number } | null
  ) => void;
}

export const TrackTimeSettings = (props: TrackTimeSettingsProps) => {
  const { song, extendedTracks, onSave } = props;

  const [open, setOpen] = useState(false);
  const [isCustomTimeEnabled, setIsCustomTimeEnabled] = useState(false);
  const [startMinutes, setStartMinutes] = useState(0);
  const [startSeconds, setStartSeconds] = useState(0);
  const [startFractionalSeconds, setStartFractionalSeconds] = useState(0);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      const info = extendedTracks.get(song.id);
      if (info) {
        setIsCustomTimeEnabled(true);
        const [minutesStr, secondsStr] = info.start.split(':');
        const minutes = parseInt(minutesStr, 10) || 0;
        const [wholeSecondsStr, fractionalSecondsStr] = (secondsStr || '0').split('.');
        const secs = parseInt(wholeSecondsStr, 10) || 0;
        const fracSecs = parseInt(fractionalSecondsStr || '0', 10) || 0;

        setStartMinutes(minutes);
        setStartSeconds(secs);
        setStartFractionalSeconds(fracSecs);
        setSeconds(info.duration);
      } else {
        setIsCustomTimeEnabled(false);
        setStartMinutes(0);
        setStartSeconds(0);
        setStartFractionalSeconds(0);
        setSeconds(null);
      }
    }
  }, [open, song.id, extendedTracks]);

  const trackDurationMs = song.duration_ms;
  const maxMinutes = Math.floor(trackDurationMs / 60000);
  const maxSeconds = Math.floor((trackDurationMs % 60000) / 1000);
  const totalSeconds = trackDurationMs / 1000;

  const minuteOptions = Array.from({ length: maxMinutes + 1 }, (_, i) => ({
    value: i,
    label: String(i).padStart(2, '0'),
  }));

  const secondOptions = Array.from(
    { length: startMinutes === maxMinutes ? maxSeconds + 1 : 60 },
    (_, i) => ({ value: i, label: String(i).padStart(2, '0') })
  );

  const fractionalSecondOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i,
    label: String(i),
  }));

  const startTimeInSeconds =
    startMinutes * 60 + startSeconds + startFractionalSeconds / 10;
  const remainingSeconds = Math.max(totalSeconds - startTimeInSeconds, 0);

  const info = extendedTracks.get(song.id);
  const duration = info
    ? `${info.start}-${msToTime(
        timeToMs(info.start) + info.duration * 1000
      )}`
    : msToTime(song.duration_ms);

  const handleOk = () => {
    if (isCustomTimeEnabled) {
      if (seconds !== null) {
        const start = `${String(startMinutes).padStart(2, '0')}:${String(
          startSeconds
        ).padStart(2, '0')}.${startFractionalSeconds}`;
        onSave(song.id, song.name, {
          start,
          duration: seconds,
        });
      }
    } else {
      onSave(song.id, song.name, null);
    }
    setOpen(false);
  };

  return (
    <>
      <p
        className='text-right '
        style={{
          flex: 2,
          display: 'flex',
          justifyContent: 'end',
          alignItems: 'center',
        }}
      >
        {duration}
        <button
          className='ml-2 text-xs'
          onClick={() => setOpen(true)}
          aria-label='settings'
        >
          <FaGear />
        </button>
      </p>
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <Modal
          destroyOnClose
          className='track-time-settings-modal'
          open={open}
          onOk={handleOk}
          onCancel={() => setOpen(false)}
          title={`設定 ${song.name} 播放時長`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Switch
              checked={isCustomTimeEnabled}
              onChange={setIsCustomTimeEnabled}
            />
            <span>自訂播放時間</span>
          </div>
          {isCustomTimeEnabled && (
            <div className='mt-4'>
              <div
                className='mb-2 w-full'
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <Select
                  value={startMinutes}
                  onChange={setStartMinutes}
                  options={minuteOptions}
                  style={{ flex: 1 }}
                />
                <span className='text-lg'>:</span>
                <Select
                  value={startSeconds}
                  onChange={setStartSeconds}
                  options={secondOptions}
                  style={{ flex: 1 }}
                />
                <span className='text-lg'>.</span>
                <Select
                  value={startFractionalSeconds}
                  onChange={setStartFractionalSeconds}
                  options={fractionalSecondOptions}
                  style={{ flex: 1 }}
                />
              </div>
              <InputNumber
                placeholder='播放秒數'
                className='duration-input w-full'
                value={seconds ?? undefined}
                onChange={(value) =>
                  setSeconds(typeof value === 'number' ? value : null)
                }
                max={remainingSeconds}
                step='0.1'
                min={0}
                inputMode='decimal'
              />
            </div>
          )}
        </Modal>
      </ConfigProvider>
    </>
  );
};

export default TrackTimeSettings;
