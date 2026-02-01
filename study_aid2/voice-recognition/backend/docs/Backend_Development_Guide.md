# 后端开发指南

## 项目结构

```
voice-recognition/backend/
├── package.json              # 项目配置
├── .env.example            # 环境变量示例
├── test-api.js            # API测试脚本
├── src/
│   ├── index.js           # 入口文件
│   ├── config.js          # 配置文件
│   ├── api/              # API模块
│   │   ├── xunfei.js   # 科大讯飞API
│   │   └── websocket.js # WebSocket服务器
│   ├── services/         # 服务层
│   │   ├── audioService.js      # 音频处理服务
│   │   └── recognitionService.js # 识别服务
│   └── utils/            # 工具函数
├── tests/               # 测试目录
│   ├── unit/            # 单元测试
│   └── integration/     # 集成测试
└── docs/               # 文档
```

## 开发环境设置

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入科大讯飞API密钥：

```env
XUNFEI_APP_ID=your_app_id_here
XUNFEI_API_KEY=your_api_key_here
XUNFEI_API_SECRET=your_api_secret_here
PORT=8080
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 测试API连接

```bash
node test-api.js
```

## 核心功能

### 1. WebSocket服务器

WebSocket服务器处理客户端连接和消息：

```javascript
const WebSocketServer = require('./api/websocket');

const server = new WebSocketServer({
  port: 8080,
  xunfei: {
    url: 'wss://rtasr.xfyun.cn/v1/ws',
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET'
  }
});

server.start();
```

### 2. 科大讯飞API集成

科大讯飞WebSocket客户端：

```javascript
const XunfeiWebSocket = require('./api/xunfei');

const client = new XunfeiWebSocket({
  url: 'wss://rtasr.xfyun.cn/v1/ws',
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET'
});

client.onResult = (result) => {
  console.log('识别结果:', result.text);
};

client.connect();
```

### 3. 音频处理

音频数据处理：

```javascript
const AudioService = require('./services/audioService');

const pcmData = AudioService.convertToPCM(audioData, 16000);
const normalizedData = AudioService.normalizeAudio(audioData);
const cleanData = AudioService.applyNoiseReduction(audioData);
```

### 4. 识别结果管理

识别结果缓存和管理：

```javascript
const RecognitionService = require('./services/recognitionService');

const service = new RecognitionService();
const sessionId = service.startSession();

service.addResult({
  text: '识别文本',
  confidence: 0.95,
  timestamp: Date.now()
});

const results = service.endSession();
```

## API接口

### WebSocket消息格式

#### 客户端 → 服务器

**音频数据：**
```json
{
  "type": "audio",
  "data": [0.1, -0.2, 0.3, ...],
  "sampleRate": 16000,
  "channels": 1,
  "timestamp": 1706712000000
}
```

**停止识别：**
```json
{
  "type": "stop"
}
```

#### 服务器 → 客户端

**识别结果：**
```json
{
  "text": "识别文本",
  "isFinal": true,
  "confidence": 0.95,
  "timestamp": 1706712000000,
  "language": "zh"
}
```

**错误消息：**
```json
{
  "type": "error",
  "error": "错误描述"
}
```

## 配置说明

### 服务器配置

```javascript
server: {
  port: 8080,           // WebSocket端口
  host: '0.0.0.0'       // 监听地址
}
```

### 科大讯飞配置

```javascript
xunfei: {
  url: 'wss://rtasr.xfyun.cn/v1/ws',  // WebSocket URL
  appId: 'YOUR_APP_ID',                // 应用ID
  apiKey: 'YOUR_API_KEY',              // API密钥
  apiSecret: 'YOUR_API_SECRET'          // API密钥
}
```

### 音频配置

```javascript
audio: {
  sampleRate: 16000,    // 采样率（Hz）
  channels: 1,          // 声道数
  bitDepth: 16          // 位深度
}
```

## 错误处理

### 1. WebSocket错误

```javascript
ws.on('error', (error) => {
  console.error('WebSocket错误:', error);
  // 实现重连逻辑
});
```

### 2. API错误

```javascript
client.onError = (error) => {
  console.error('API错误:', error);
  // 处理错误
};
```

### 3. 音频数据错误

```javascript
try {
  AudioService.validateAudioData(audioData);
} catch (err) {
  console.error('音频数据错误:', err);
}
```

## 性能优化

### 1. 音频处理优化

- 使用Int16Array代替Float32Array
- 批量处理音频数据
- 使用Web Worker处理音频

### 2. 内存管理

- 及时释放音频资源
- 限制缓存大小
- 实现LRU缓存

### 3. 并发处理

- 使用Worker Threads
- 实现连接池
- 限制并发连接数

## 测试

### 单元测试

```bash
npm test
```

### 集成测试

```bash
npm run test:integration
```

### 测试覆盖率

```bash
npm run test:coverage
```

## 部署

### 1. 环境变量

生产环境使用环境变量：

```bash
export XUNFEI_APP_ID=your_app_id
export XUNFEI_API_KEY=your_api_key
export XUNFEI_API_SECRET=your_api_secret
export PORT=8080
```

### 2. 使用PM2部署

```bash
npm install -g pm2
pm2 start src/index.js --name voice-recognition-backend
pm2 save
pm2 startup
```

### 3. 使用Docker部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
```

构建和运行：

```bash
docker build -t voice-recognition-backend .
docker run -p 8080:8080 --env-file .env voice-recognition-backend
```

## 监控和日志

### 1. 日志级别

```javascript
const logger = require('./utils/logger');

logger.debug('调试信息');
logger.info('普通信息');
logger.warn('警告信息');
logger.error('错误信息');
```

### 2. 性能监控

```javascript
const performance = require('perf_hooks');

const start = performance.now();
// 执行操作
const duration = performance.now() - start;
console.log(`操作耗时: ${duration}ms`);
```

### 3. 健康检查

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});
```

## 安全建议

### 1. API密钥保护

- 使用环境变量
- 不要提交到版本控制
- 定期更换密钥

### 2. 输入验证

```javascript
function validateAudioData(data) {
  if (!data || !Array.isArray(data)) {
    throw new Error('无效的音频数据');
  }
  if (data.length > 1000000) {
    throw new Error('音频数据过大');
  }
}
```

### 3. 速率限制

```javascript
const rateLimiter = require('express-rate-limit');

app.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 最多100个请求
}));
```

## 常见问题

### 1. 科大讯飞API连接失败

**解决方案：**
- 检查API密钥是否正确
- 检查网络连接
- 检查防火墙设置

### 2. WebSocket连接断开

**解决方案：**
- 实现自动重连
- 检查服务器负载
- 增加超时时间

### 3. 音频数据处理慢

**解决方案：**
- 优化音频处理算法
- 使用Web Worker
- 减少数据量

## 参考资料

- [科大讯飞API文档](https://www.xfyun.cn/doc/asr/voicedictation/API.html)
- [WebSocket文档](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Node.js文档](https://nodejs.org/docs/)
- [PM2文档](https://pm2.keymetrics.io/)
- [Docker文档](https://docs.docker.com/)
