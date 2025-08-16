import { useState, useEffect } from 'react';
import {
  ConfigProvider,
  Modal,
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
  const [endMinutes, setEndMinutes] = useState(0);
  const [endSeconds, setEndSeconds] = useState(0);
  const [endFractionalSeconds, setEndFractionalSeconds] = useState(0);

  useEffect(() => {
    if (open) {
      const info = extendedTracks.get(song.id);
      if (info) {
        setIsCustomTimeEnabled(true);
        const [minutesStr, secondsStr] = info.start.split(':');
        const minutes = parseInt(minutesStr, 10) || 0;
        const [wholeSecondsStr, fractionalSecondsStr] = (
          secondsStr || '0'
        ).split('.');
        const secs = parseInt(wholeSecondsStr, 10) || 0;
        const fracSecs = parseInt(fractionalSecondsStr || '0', 10) || 0;

        setStartMinutes(minutes);
        setStartSeconds(secs);
        setStartFractionalSeconds(fracSecs);

        const startTimeInMs = timeToMs(info.start);
        const endTimeInMs = startTimeInMs + info.duration * 1000;

        const endTotalSeconds = Math.floor(endTimeInMs / 1000);
        const endMins = Math.floor(endTotalSeconds / 60);
        const endSecs = endTotalSeconds % 60;
        const endFracSecs = Math.floor((endTimeInMs % 1000) / 100);

        setEndMinutes(endMins);
        setEndSeconds(endSecs);
        setEndFractionalSeconds(endFracSecs);
      } else {
        setIsCustomTimeEnabled(false);
        setStartMinutes(0);
        setStartSeconds(0);
        setStartFractionalSeconds(0);
        setEndMinutes(0);
        setEndSeconds(0);
        setEndFractionalSeconds(0);
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

  const endMinuteOptions = minuteOptions.slice(startMinutes);

  const endSecondOptions =
    endMinutes === startMinutes
      ? secondOptions.slice(startSeconds)
      : secondOptions;

  const endFractionalSecondOptions =
    endMinutes === startMinutes && endSeconds === startSeconds
      ? fractionalSecondOptions.slice(startFractionalSeconds)
      : fractionalSecondOptions;

  useEffect(() => {
    const startTimeInMs =
      startMinutes * 60000 + startSeconds * 1000 + startFractionalSeconds * 100;
    const endTimeInMs =
      endMinutes * 60000 + endSeconds * 1000 + endFractionalSeconds * 100;

    if (endTimeInMs < startTimeInMs) {
      setEndMinutes(startMinutes);
      setEndSeconds(startSeconds);
      setEndFractionalSeconds(startFractionalSeconds);
    }
  }, [
    startMinutes,
    startSeconds,
    startFractionalSeconds,
    endMinutes,
    endSeconds,
    endFractionalSeconds,
  ]);

  const info = extendedTracks.get(song.id);
  const duration = info
    ? `${info.start}-${msToTime(
        timeToMs(info.start) + info.duration * 1000
      )}`
    : msToTime(song.duration_ms);

  const handleOk = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isCustomTimeEnabled) {
      const startTimeInMs =
        startMinutes * 60000 +
        startSeconds * 1000 +
        startFractionalSeconds * 100;
      const endTimeInMs =
        endMinutes * 60000 + endSeconds * 1000 + endFractionalSeconds * 100;

      const durationInSeconds = (endTimeInMs - startTimeInMs) / 1000;

      if (durationInSeconds >= 0) {
        const start = `${String(startMinutes).padStart(2, '0')}:${String(
          startSeconds
        ).padStart(2, '0')}.${startFractionalSeconds}`;
        onSave(song.id, song.name, {
          start,
          duration: durationInSeconds,
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
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
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
          onCancel={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
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
              <div>
                <label
                  htmlFor='start-time-min'
                  className='mb-1 block text-sm font-medium'
                >
                  Start Time
                </label>
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
              </div>
              <div>
                <label
                  htmlFor='end-time-min'
                  className='mb-1 block text-sm font-medium'
                >
                  End Time
                </label>
                <div
                  className='w-full'
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <Select
                    value={endMinutes}
                    onChange={setEndMinutes}
                    options={endMinuteOptions}
                    style={{ flex: 1 }}
                  />
                  <span className='text-lg'>:</span>
                  <Select
                    value={endSeconds}
                    onChange={setEndSeconds}
                    options={endSecondOptions}
                    style={{ flex: 1 }}
                  />
                  <span className='text-lg'>.</span>
                  <Select
                    value={endFractionalSeconds}
                    onChange={setEndFractionalSeconds}
                    options={endFractionalSecondOptions}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>
      </ConfigProvider>
    </>
  );
};

export default TrackTimeSettings;
