# 前端开发指南

## 项目结构

```
voice-recognition/frontend/
├── package.json              # 项目配置
├── vite.config.js           # Vite配置
├── index.html               # HTML入口
├── src/
│   ├── main/                # Electron主进程
│   │   ├── index.js        # 主进程入口
│   │   └── preload.js     # 预加载脚本
│   └── renderer/           # 渲染进程（React）
│       ├── index.jsx        # React入口
│       ├── App.jsx         # 主应用组件
│       ├── components/      # React组件
│       ├── hooks/          # 自定义Hooks
│       ├── utils/          # 工具函数
│       └── styles/        # 样式文件
└── docs/                 # 文档
```

## 开发环境设置

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

这将启动：
- Vite开发服务器（端口5173）
- Electron应用

### 3. 构建生产版本

```bash
npm run build
```

### 4. 打包应用

```bash
npm run build:win    # Windows
npm run build:mac    # macOS
```

## 核心功能

### 1. 音频采集

使用 `useAudioRecorder` Hook：

```javascript
const { isRecording, startRecording, stopRecording, onData } = useAudioRecorder(audioSource);

onData((audioData) => {
  // 处理音频数据
});
```

### 2. 语音识别

使用 `useRecognition` Hook：

```javascript
const { status, recognizedText, startRecognition, stopRecognition, sendAudioData } = useRecognition('ws://localhost:8080');

// 发送音频数据
sendAudioData(audioData);
```

### 3. VB-Cable检测

使用 `useVBCable` Hook：

```javascript
const { isInstalled, isLoading } = useVBCable();
```

### 4. 文件保存

使用 `saveAsTxt` 函数：

```javascript
import { saveAsTxt } from '@utils/fileUtils';

const result = await saveAsTxt(content, filename);
```

## 组件说明

### AudioSourceSelector

音频源选择器组件，支持：
- 麦克风输入
- 系统音频输入（VB-Cable）

### TextDisplay

文本显示组件，实时显示识别结果。

### ControlButtons

控制按钮组件：
- 开始录音
- 停止录音
- 保存为TXT

### StatusIndicator

状态指示器，显示当前状态：
- 已停止
- 连接中
- 录音中
- 错误

### VBCableNotice

VB-Cable未安装提示组件。

## 样式规范

### 颜色主题

- 主色：`#667eea` → `#764ba2`（渐变）
- 成功色：`#52c41a`
- 警告色：`#faad14`
- 错误色：`#f5222d`

### 响应式断点

- 移动端：`< 768px`
- 平板：`768px - 1024px`
- 桌面：`> 1024px`

## 开发注意事项

### 1. 音频权限

首次使用需要用户授权麦克风权限。

### 2. VB-Cable配置

使用系统音频需要：
1. 安装VB-Cable
2. 配置音频输出到VB-Cable
3. 在应用中选择VB-Cable作为输入

### 3. WebSocket连接

确保后端服务已启动（端口8080）。

### 4. 文件保存

文件保存使用Electron的文件对话框。

## 调试技巧

### 1. 开启DevTools

开发模式下自动打开DevTools。

### 2. 查看日志

```bash
# 查看Electron日志
npm run dev

# 查看浏览器控制台
F12 或 Ctrl+Shift+I
```

### 3. 测试音频

使用在线工具测试音频设备：
- https://www.onlinemictest.com/
- https://www.audiocheck.net/

## 常见问题

### 1. 麦克风无法使用

**解决方案：**
- 检查浏览器权限
- 检查系统音频设置
- 重启应用

### 2. WebSocket连接失败

**解决方案：**
- 检查后端服务是否启动
- 检查端口8080是否被占用
- 检查防火墙设置

### 3. VB-Cable未检测到

**解决方案：**
- 重新安装VB-Cable
- 重启电脑
- 检查音频设备管理器

## 性能优化

### 1. 音频处理

- 使用Web Worker处理音频
- 降低采样率（16000Hz）
- 使用Int16Array存储音频数据

### 2. 渲染优化

- 使用React.memo优化组件
- 使用useCallback和useMemo
- 避免不必要的重新渲染

### 3. 内存管理

- 及时释放音频资源
- 清理WebSocket连接
- 避免内存泄漏

## 测试

### 单元测试

```bash
npm test
```

### E2E测试

```bash
npm run test:e2e
```

## 部署

### 1. 构建

```bash
npm run build
```

### 2. 打包

```bash
npm run build:win
```

生成的安装包在 `dist` 目录。

### 3. 分发

- Windows：`.exe` 安装包
- macOS：`.dmg` 磁盘镜像
- Linux：`.AppImage`

## 参考资料

- [Electron文档](https://www.electronjs.org/docs)
- [React文档](https://react.dev/)
- [Vite文档](https://vitejs.dev/)
- [Ant Design文档](https://ant.design/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
