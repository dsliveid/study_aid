require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0'
  },
  xunfei: {
    url: process.env.XUNFEI_URL || 'wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1',
    appId: process.env.XUNFEI_APP_ID || '',
    accessKeyId: process.env.XUNFEI_API_KEY || '',
    accessKeySecret: process.env.XUNFEI_API_SECRET || ''
  },
  audio: {
    sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE) || 16000,
    channels: parseInt(process.env.AUDIO_CHANNELS) || 1,
    bitDepth: parseInt(process.env.AUDIO_BIT_DEPTH) || 16,
    frameSize: 1280,
    frameInterval: 40
  },
  recognition: {
    language: 'zh_cn',
    punc: 1,
    format: 'json'
  }
};
