export const secondsToTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedSeconds = remainingSeconds.toFixed(1);
  return `${minutes}:${formattedSeconds.padStart(4, '0')}`;
};

export const msToTime = (ms: number) => {
  const seconds = ms / 1000;
  return secondsToTime(seconds);
};

export const timeToMs = (time: string) => {
  const [minutes, seconds] = time.split(':').map(Number);
  return (minutes * 60 + seconds) * 1000;
};
