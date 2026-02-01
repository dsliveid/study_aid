export const convertToPCM = (audioData, sampleRate = 16000) => {
  const pcmData = new Int16Array(audioData.length);

  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i];
    pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32767));
  }

  return pcmData;
};

export const validateAudioData = (audioData) => {
  if (!audioData || audioData.length === 0) {
    throw new Error('音频数据为空');
  }
  return true;
};

export const formatDuration = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const generateFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `语音识别_${timestamp}.txt`;
};
