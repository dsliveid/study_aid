const WebSocket = require('ws');
const XunfeiWebSocket = require('./xunfei');

class WebSocketServer {
  constructor(config) {
    this.config = config;
    this.wss = null;
    this.clients = new Map();
    this.xunfeiClient = null;
    this.activeClients = new Set();
    this.hasAudioData = false;
    this.reconnectTimeout = null;
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.config.port });

    this.wss.on('listening', () => {
      console.log(`WebSocket服务器启动，监听端口 ${this.config.port}`);
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      this.activeClients.add(clientId);

      console.log(`客户端连接: ${clientId} (当前活跃客户端: ${this.activeClients.size})`);

      ws.on('message', (message) => {
        this.handleClientMessage(clientId, message);
      });

      ws.on('close', () => {
        console.log(`客户端断开: ${clientId}`);
        this.clients.delete(clientId);
        this.activeClients.delete(clientId);
        
        if (this.activeClients.size === 0) {
          console.log('所有客户端已断开，停止科大讯飞连接');
          this.stopXunfeiClient();
        }
      });

      ws.on('error', (error) => {
        console.error(`客户端错误 (${clientId}):`, error);
        this.clients.delete(clientId);
        this.activeClients.delete(clientId);
        
        if (this.activeClients.size === 0) {
          console.log('所有客户端已断开，停止科大讯飞连接');
          this.stopXunfeiClient();
        }
      });

      ws.send(JSON.stringify({
        type: 'connected',
        clientId
      }));

      if (this.activeClients.size === 1) {
        console.log('第一个客户端连接，准备启动科大讯飞API');
      }
    });

    this.initXunfeiClient();
  }

  initXunfeiClient() {
    this.xunfeiClient = new XunfeiWebSocket({
      url: this.config.xunfei.url,
      appId: this.config.xunfei.appId,
      accessKeyId: this.config.xunfei.accessKeyId,
      accessKeySecret: this.config.xunfei.accessKeySecret
    });

    this.xunfeiClient.onResult = (result) => {
      this.broadcastResult(result);
    };

    this.xunfeiClient.onError = (error) => {
      this.broadcastError(error.message);
    };

    this.xunfeiClient.connect().catch(err => {
      console.error('连接科大讯飞API失败:', err);
    });
  }

  handleClientMessage(clientId, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'audio':
          this.handleAudioData(clientId, data);
          break;
        case 'stop':
          this.handleStopRecognition(clientId);
          break;
        default:
          console.warn(`未知消息类型: ${data.type}`);
      }
    } catch (err) {
      console.error('解析客户端消息失败:', err);
    }
  }

  handleAudioData(clientId, data) {
    if (this.xunfeiClient) {
      const audioData = new Int16Array(data.data);
      this.xunfeiClient.sendAudio(audioData);
      
      if (!this.hasAudioData) {
        this.hasAudioData = true;
        console.log('开始接收音频数据，科大讯飞连接保持活跃');
      }
    }
  }

  handleStopRecognition(clientId) {
    console.log(`停止识别: ${clientId}`);
    if (this.xunfeiClient) {
      this.xunfeiClient.sendEndFrame();
    }
  }

  stopXunfeiClient() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.xunfeiClient) {
      this.xunfeiClient.disconnect();
      this.xunfeiClient = null;
      this.hasAudioData = false;
      console.log('科大讯飞客户端已断开');
    }
  }

  broadcastResult(result) {
    const message = JSON.stringify(result);
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  broadcastError(error) {
    const message = JSON.stringify({
      type: 'error',
      error
    });
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  stop() {
    if (this.xunfeiClient) {
      this.xunfeiClient.disconnect();
    }

    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = WebSocketServer;
