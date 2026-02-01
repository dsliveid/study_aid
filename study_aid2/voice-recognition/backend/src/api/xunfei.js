const WebSocket = require('ws');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class XunfeiWebSocket {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.onResult = null;
    this.onError = null;
    this.shouldReconnect = true;
    this.reconnectTimeout = null;
    this.sessionId = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.shouldReconnect = true;
      this.reconnectAttempts = 0;
      
      const authUrl = this.generateAuthUrl();
      console.log('连接到科大讯飞API:', authUrl);
      
      this.ws = new WebSocket(authUrl);

      this.ws.on('open', () => {
        console.log('科大讯飞WebSocket连接成功');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('科大讯飞WebSocket错误:', error);
        if (this.shouldReconnect) {
          this.handleReconnect();
        }
        if (this.onError) {
          this.onError(error);
        }
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('科大讯飞WebSocket连接关闭');
        if (this.shouldReconnect) {
          this.handleReconnect();
        }
      });
    });
  }

  generateAuthUrl() {
    const authParams = {
      accessKeyId: this.config.accessKeyId,
      appId: this.config.appId,
      uuid: uuidv4().replace(/-/g, ''),
      utc: this.getUtcTime(),
      audio_encode: 'pcm_s16le',
      lang: 'autodialect',
      samplerate: '16000'
    };

    const sortedParams = dictSort(authParams);
    const baseStr = Object.entries(sortedParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const signature = crypto
      .createHmac('sha1', this.config.accessKeySecret)
      .update(baseStr)
      .digest('base64');

    authParams.signature = signature;

    const paramsStr = Object.entries(authParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    return `${this.config.url}?${paramsStr}`;
  }

  getUtcTime() {
    const now = new Date();
    const offset = 8;
    const beijingTime = new Date(now.getTime() + offset * 3600 * 1000);
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
    const timezone = offset >= 0 ? `+${String(offset).padStart(2, '0')}00` : `${String(offset).padStart(3, '0')}00`;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
  }

  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const buffer = Buffer.from(audioData.buffer);
      this.ws.send(buffer);
    }
  }

  sendEndFrame() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const endMsg = { end: true };
      if (this.sessionId) {
        endMsg.sessionId = this.sessionId;
      }
      const endMsgStr = JSON.stringify(endMsg);
      console.log('发送结束帧:', endMsgStr);
      this.ws.send(endMsgStr);
    }
  }

  handleMessage(data) {
    try {
      const msg = data.toString();
      const result = JSON.parse(msg);

      console.log('收到消息:', result);

      if (result.msg_type === 'action' && result.data && result.data.sessionId) {
        this.sessionId = result.data.sessionId;
        console.log('会话ID:', this.sessionId);
      }

      if (result.msg_type === 'result' && result.data) {
        if (this.onResult) {
          this.onResult({
            text: result.data.text || '',
            isFinal: result.data.isFinal || false,
            confidence: result.data.confidence || 0,
            timestamp: Date.now(),
            language: 'zh'
          });
        }
      } else if (result.msg_type === 'error') {
        console.error('科大讯飞API错误:', result);
        if (this.onError) {
          this.onError(new Error(result.message || '识别错误'));
        }
      }
    } catch (err) {
      console.error('解析科大讯飞响应失败:', err);
    }
  }

  handleReconnect() {
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectAttempts++;
      this.reconnectTimeout = setTimeout(() => {
        console.log(`尝试重连科大讯飞API (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, 1000 * this.reconnectAttempts);
    } else {
      console.log('停止重连：达到最大重连次数或被手动停止');
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

function dictSort(obj) {
  const keys = Object.keys(obj).sort();
  const result = {};
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

module.exports = XunfeiWebSocket;