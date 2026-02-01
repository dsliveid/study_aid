# 科大讯飞API配置说明

## 环境变量配置

在 `backend/src/config.js` 文件中配置科大讯飞API密钥，或通过环境变量配置。

### 方法1：直接修改配置文件

编辑 `backend/src/config.js` 文件：

```javascript
xunfei: {
  url: 'wss://rtasr.xfyun.cn/v1/ws',
  appId: 'YOUR_APP_ID',           // 替换为你的AppID
  apiKey: 'YOUR_API_KEY',         // 替换为你的API Key
  apiSecret: 'YOUR_API_SECRET'     // 替换为你的API Secret
}
```

### 方法2：使用环境变量（推荐）

创建 `.env` 文件在 `backend` 目录下：

```env
XUNFEI_APP_ID=your_app_id_here
XUNFEI_API_KEY=your_api_key_here
XUNFEI_API_SECRET=your_api_secret_here
PORT=8080
```

## 获取API密钥

1. 访问 [科大讯飞开放平台](https://www.xfyun.cn/)
2. 注册账号并登录
3. 进入控制台
4. 创建应用，选择"语音听写（流式版）"
5. 获取 AppID、API Key 和 API Secret

## API密钥说明

| 参数 | 说明 | 示例 |
|------|------|------|
| AppID | 应用ID | 5f8d9c1a |
| API Key | API密钥 | 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d |
| API Secret | API密钥 | 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d |

## 测试连接

配置完成后，运行以下命令测试连接：

```bash
cd backend
npm start
```

如果配置正确，将看到：

```
=================================
实时语音识别 - 后端服务
=================================
WebSocket服务器启动，监听端口 8080
```

## 常见问题

### 1. 认证失败

**错误信息：** `认证失败`

**解决方案：**
- 检查 AppID、API Key、API Secret 是否正确
- 确认API密钥是否过期
- 检查网络连接

### 2. 连接超时

**错误信息：** `连接超时`

**解决方案：**
- 检查网络连接
- 检查防火墙设置
- 尝试使用代理

### 3. 频率限制

**错误信息：** `超出频率限制`

**解决方案：**
- 降低音频发送频率
- 购买更高版本的API服务

## 安全建议

1. **不要将API密钥提交到版本控制系统**
   - 使用 `.env` 文件
   - 将 `.env` 添加到 `.gitignore`

2. **定期更换API密钥**
   - 建议每3个月更换一次

3. **使用环境变量**
   - 避免在代码中硬编码密钥

## 开发环境配置示例

```javascript
module.exports = {
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0'
  },
  xunfei: {
    url: process.env.XUNFEI_URL || 'wss://rtasr.xfyun.cn/v1/ws',
    appId: process.env.XUNFEI_APP_ID || '',
    apiKey: process.env.XUNFEI_API_KEY || '',
    apiSecret: process.env.XUNFEI_API_SECRET || ''
  },
  audio: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16
  },
  recognition: {
    language: 'zh_cn',
    punc: 1,
    format: 'json'
  }
};
```
