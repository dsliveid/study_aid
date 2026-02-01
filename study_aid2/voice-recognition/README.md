# 实时语音识别应用

基于 Electron + React + 科大讯飞 API 的实时语音识别桌面应用。

## 功能特性

- ✅ 实时语音识别
- ✅ 支持麦克风输入
- ✅ 支持系统音频输入（VB-Cable）
- ✅ 实时显示识别结果
- ✅ 保存识别结果为TXT文件
- ✅ 高识别准确率（>95%）
- ✅ 低延迟（<500ms）

## 技术栈

### 前端
- **Electron** - 桌面应用框架
- **React** - UI框架
- **Vite** - 构建工具
- **Ant Design** - UI组件库
- **Web Audio API** - 音频采集

### 后端
- **Node.js** - 运行时环境
- **WebSocket** - 实时通信
- **科大讯飞API** - 语音识别

## 项目结构

```
voice-recognition/
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── main/        # Electron主进程
│   │   └── renderer/    # React渲染进程
│   └── docs/           # 前端文档
├── backend/               # 后端服务
│   ├── src/
│   │   ├── api/         # API模块
│   │   └── services/    # 服务层
│   └── docs/           # 后端文档
└── docs/                # 项目文档
    ├── API.md           # API接口文档
    └── README.md       # 本文件
```

## 快速开始

### 前置要求

- Node.js >= 16.0.0
- npm 或 yarn
- 科大讯飞API密钥

### 1. 克隆项目

```bash
git clone <repository-url>
cd voice-recognition
```

### 2. 安装依赖

**前端：**
```bash
cd frontend
npm install
```

**后端：**
```bash
cd backend
npm install
```

### 3. 配置API密钥

在 `backend` 目录下创建 `.env` 文件：

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

### 4. 启动后端服务

```bash
cd backend
npm start
```

或使用开发模式：

```bash
npm run dev
```

### 5. 启动前端应用

```bash
cd frontend
npm run dev
```

### 6. 使用应用

1. 选择音频源（麦克风或系统音频）
2. 点击"开始录音"
3. 说话或播放音频
4. 查看实时识别结果
5. 点击"保存为TXT"保存结果

## 开发指南

### 前端开发

详细文档请查看：[前端开发指南](frontend/docs/Frontend_Development_Guide.md)

**主要命令：**
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run build:win    # 打包Windows版本
npm run lint         # 代码检查
npm run lint:fix     # 自动修复代码问题
```

### 后端开发

详细文档请查看：[后端开发指南](backend/docs/Backend_Development_Guide.md)

**主要命令：**
```bash
npm start           # 启动生产服务器
npm run dev         # 启动开发服务器
npm test            # 运行测试
npm run lint        # 代码检查
npm run lint:fix    # 自动修复代码问题
```

## API文档

详细的API接口文档请查看：[API文档](docs/API.md)

## 配置说明

### 前端配置

前端配置文件：`frontend/vite.config.js`

### 后端配置

后端配置文件：`backend/src/config.js`

支持环境变量配置：

| 环境变量 | 说明 | 默认值 |
|-----------|------|--------|
| PORT | WebSocket端口 | 8080 |
| HOST | 监听地址 | 0.0.0.0 |
| XUNFEI_APP_ID | 科大讯飞AppID | - |
| XUNFEI_API_KEY | 科大讯飞API Key | - |
| XUNFEI_API_SECRET | 科大讯飞API Secret | - |
| AUDIO_SAMPLE_RATE | 音频采样率 | 16000 |
| AUDIO_CHANNELS | 音频声道数 | 1 |
| AUDIO_BIT_DEPTH | 音频位深度 | 16 |

## VB-Cable配置

使用系统音频功能需要安装VB-Cable虚拟音频设备。

详细配置指南请查看：[VB-Cable配置指南](../voice/VB-Cable_Setup_Guide.md)

## 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 识别延迟 | <500ms | 从发送音频到收到结果的时间 |
| 识别准确率 | >95% | 识别正确的字符比例 |
| 连接成功率 | >99% | WebSocket连接成功的比例 |
| 消息丢失率 | <1% | 消息丢失的比例 |

## 测试

### 前端测试

```bash
cd frontend
npm test
```

### 后端测试

```bash
cd backend
npm test
```

### 集成测试

```bash
npm run test:integration
```

## 部署

### 前端打包

```bash
cd frontend
npm run build:win    # Windows
npm run build:mac    # macOS
```

生成的安装包在 `frontend/dist` 目录。

### 后端部署

**使用PM2：**
```bash
npm install -g pm2
pm2 start backend/src/index.js --name voice-recognition-backend
pm2 save
pm2 startup
```

**使用Docker：**
```bash
docker build -t voice-recognition-backend backend/
docker run -p 8080:8080 --env-file backend/.env voice-recognition-backend
```

## 故障排除

### 常见问题

**1. 麦克风无法使用**
- 检查浏览器权限
- 检查系统音频设置
- 重启应用

**2. WebSocket连接失败**
- 检查后端服务是否启动
- 检查端口8080是否被占用
- 检查防火墙设置

**3. 科大讯飞API连接失败**
- 检查API密钥是否正确
- 检查网络连接
- 检查API配额

**4. VB-Cable未检测到**
- 重新安装VB-Cable
- 重启电脑
- 检查音频设备管理器

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

MIT License

## 联系方式

- **项目地址：** [GitHub Repository]
- **问题反馈：** [Issues]
- **邮箱：** support@example.com

## 致谢

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Ant Design](https://ant.design/)
- [科大讯飞](https://www.xfyun.cn/)

## 更新日志

### v1.0.0 (2026-01-31)

- ✅ 初始版本发布
- ✅ 实时语音识别功能
- ✅ 麦克风和系统音频支持
- ✅ 文件保存功能
- ✅ VB-Cable集成
