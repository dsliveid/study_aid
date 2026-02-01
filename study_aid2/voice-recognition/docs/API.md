# 实时语音识别 API 接口文档

## 1. 概述

本文档描述了实时语音识别应用的前后端接口规范。

**协议：** WebSocket  
**数据格式：** JSON  
**字符编码：** UTF-8

---

## 2. WebSocket 连接

### 2.1 连接地址

```
ws://localhost:8080
```

### 2.2 连接流程

1. 客户端发起WebSocket连接
2. 服务器返回连接成功消息
3. 客户端发送音频数据
4. 服务器返回识别结果

### 2.3 连接消息

**服务器 → 客户端**

```json
{
  "type": "connected",
  "clientId": "client_1234567890_abc123"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 消息类型，固定为"connected" |
| clientId | string | 客户端唯一标识符 |

---

## 3. 消息类型

### 3.1 音频数据发送

**客户端 → 服务器**

```json
{
  "type": "audio",
  "data": [0.1, -0.2, 0.3, ...],
  "sampleRate": 16000,
  "channels": 1,
  "timestamp": 1706712000000
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 消息类型，固定为"audio" |
| data | number[] | 是 | 音频数据数组（Float32格式） |
| sampleRate | number | 是 | 采样率，固定为16000 |
| channels | number | 是 | 声道数，固定为1 |
| timestamp | number | 是 | 时间戳（毫秒） |

**注意事项：**
- 音频数据为Float32格式，范围[-1.0, 1.0]
- 采样率必须为16000Hz
- 声道数必须为1（单声道）
- 建议每4096个采样点发送一次

### 3.2 停止识别

**客户端 → 服务器**

```json
{
  "type": "stop"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 消息类型，固定为"stop" |

### 3.3 识别结果

**服务器 → 客户端**

```json
{
  "text": "这是一个实时语音识别的演示",
  "isFinal": true,
  "confidence": 0.95,
  "timestamp": 1706712000000,
  "language": "zh"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| text | string | 识别文本 |
| isFinal | boolean | 是否为最终结果（true=最终，false=临时） |
| confidence | number | 置信度（0-1） |
| timestamp | number | 时间戳（毫秒） |
| language | string | 语言代码（zh=中文，en=英文） |

**注意事项：**
- isFinal=false时，text为临时结果，可能变化
- isFinal=true时，text为最终结果，不再变化
- 客户端应累加isFinal=true的文本

### 3.4 错误消息

**服务器 → 客户端**

```json
{
  "type": "error",
  "error": "WebSocket连接错误"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 消息类型，固定为"error" |
| error | string | 错误描述 |

---

## 4. 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| WS_CONNECTION_FAILED | WebSocket连接失败 | 检查网络连接，稍后重试 |
| WS_AUTH_FAILED | 认证失败 | 检查API密钥配置 |
| WS_TIMEOUT | 连接超时 | 检查网络，重新连接 |
| AUDIO_DATA_INVALID | 音频数据无效 | 检查音频数据格式 |
| RECOGNITION_FAILED | 识别失败 | 检查音频质量，重新识别 |
| RATE_LIMIT_EXCEEDED | 超出频率限制 | 降低发送频率 |

---

## 5. 状态管理

### 5.1 连接状态

| 状态 | 说明 |
|------|------|
| idle | 空闲，未连接 |
| connecting | 连接中 |
| recording | 录音中 |
| error | 错误 |

### 5.2 状态转换

```
idle → connecting → recording → idle
  ↓         ↓          ↓
error ← error ← error
```

---

## 6. 数据格式

### 6.1 音频数据格式

**格式：** Float32Array  
**采样率：** 16000Hz  
**声道数：** 1（单声道）  
**位深度：** 16-bit  
**范围：** [-1.0, 1.0]

**PCM转换示例：**

```javascript
function convertToPCM(audioData) {
  const pcmData = new Int16Array(audioData.length);
  
  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i];
    pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32767));
  }
  
  return pcmData;
}
```

### 6.2 时间戳格式

**格式：** Unix时间戳（毫秒）  
**示例：** 1706712000000

---

## 7. 示例代码

### 7.1 客户端连接示例

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('WebSocket连接成功');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'result') {
    console.log('识别结果:', message.text);
  } else if (message.type === 'error') {
    console.error('错误:', message.error);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket连接关闭');
};
```

### 7.2 发送音频数据示例

```javascript
function sendAudioData(audioData) {
  const message = {
    type: 'audio',
    data: Array.from(audioData),
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(message));
}
```

### 7.3 停止识别示例

```javascript
function stopRecognition() {
  const message = {
    type: 'stop'
  };
  
  ws.send(JSON.stringify(message));
}
```

---

## 8. 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 识别延迟 | <500ms | 从发送音频到收到结果的时间 |
| 识别准确率 | >95% | 识别正确的字符比例 |
| 连接成功率 | >99% | WebSocket连接成功的比例 |
| 消息丢失率 | <1% | 消息丢失的比例 |

---

## 9. 安全考虑

### 9.1 数据加密

- 生产环境建议使用WSS（WebSocket Secure）
- 音频数据传输应加密

### 9.2 认证

- 建议实现客户端认证机制
- 使用Token或API Key验证

### 9.3 限流

- 实现发送频率限制
- 防止DDoS攻击

---

## 10. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-01-31 | 初始版本 |

---

## 11. 联系方式

如有问题，请联系开发团队。

**前端开发：** frontend-dev@example.com  
**后端开发：** backend-dev@example.com  
**项目经理：** pm@example.com
