class AudioService {
  static convertToPCM(audioData, sampleRate = 16000) {
    const pcmData = new Int16Array(audioData.length);

    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32767));
    }

    return pcmData;
  }

  static validateAudioData(audioData) {
    if (!audioData || audioData.length === 0) {
      throw new Error('音频数据为空');
    }

    if (!Array.isArray(audioData) && !(audioData instanceof Int16Array)) {
      throw new Error('音频数据格式错误');
    }

    return true;
  }

  static normalizeAudio(audioData) {
    const max = Math.max(...audioData.map(Math.abs));
    if (max === 0) return audioData;

    return audioData.map(sample => sample / max);
  }

  static applyNoiseReduction(audioData) {
    const threshold = 0.02;
    return audioData.map(sample => {
      return Math.abs(sample) < threshold ? 0 : sample;
    });
  }
}

module.exports = AudioService;
