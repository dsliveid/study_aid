# 实时语音识别功能 - 优化版技术方案

## 1. 问题分析

### 1.1 浏览器原生音频处理的局限性

**问题1：无法捕获本地视频音频**
- Web Audio API只能捕获麦克风音频
- 无法直接捕获浏览器播放的本地视频音频
- 跨域限制导致无法捕获某些在线视频音频

**问题2：稳定性问题**
- 不同浏览器实现差异大
- 权限管理复杂
- 音频质量受浏览器影响

**问题3：功能限制**
- 无法捕获系统音频
- 无法捕获其他应用音频
- 无法实现虚拟音频设备

### 1.2 解决方案

**方案A：使用虚拟音频设备（推荐）**
- 安装虚拟音频设备软件（如VB-Cable、Voicemeeter）
- 将系统音频输出路由到虚拟设备
- 从虚拟设备捕获音频

**方案B：使用Electron桌面应用**
- Electron可以访问系统音频
- 支持捕获本地视频音频
- 跨平台支持

**方案C：使用浏览器扩展**
- 开发Chrome扩展捕获标签页音频
- 限制较多，需要用户安装

## 2. 语音识别API对比

### 2.1 OpenAI Whisper API vs 科大讯飞API

| 对比项 | OpenAI Whisper API | 科大讯飞API |
|--------|-------------------|--------------|
| **准确率** | 95%+ | 97-98% |
| **实时性** | 需要自行实现流式 | 原生支持实时流式（WebSocket） |
| **语言支持** | 多语言（99种） | 中文为主，支持60+语种 |
| **方言支持** | 一般 | 优秀（方言准确率98%） |
| **专业术语** | 较好 | 优秀（专业术语识别准） |
| **价格** | $0.006/分钟 | 按套餐或按量 |
| **国内访问** | 需要VPN | 无需VPN，速度快 |
| **技术支持** | 英文文档 | 中文文档，技术支持好 |
| **部署方式** | 云端API | 云端API + 本地SDK |

### 2.2 成本对比

#### OpenAI Whisper API
- 价格：$0.006/分钟
- 10小时/月：$3.6 ≈ ¥26
- 100小时/月：$36 ≈ ¥260

#### 科大讯飞API
- 实时语音转写：按量计费
- 讯飞听见个人版：年费365元（月均30.4元）
- 企业版：根据使用量定制

### 2.3 推荐方案

**推荐使用科大讯飞API**，原因：
1. ✅ 准确率更高（97-98% vs 95%）
2. ✅ 原生支持实时流式（WebSocket）
3. ✅ 国内访问速度快，无需VPN
4. ✅ 中文识别更优秀，支持方言
5. ✅ 技术支持好，中文文档完善
6. ✅ 价格合理，性价比高

## 3. 优化后的技术方案

### 3.1 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端应用 (Electron)                     │
│                  React + Ant Design                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  音频采集模块  │  │  音频处理模块  │  │  UI界面模块   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              科大讯飞实时语音转写API (WebSocket)            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术栈选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 应用框架 | Electron 27+ | 跨平台桌面应用，支持系统音频捕获 |
| 前端框架 | React 18 | 成熟稳定，生态丰富 |
| UI组件库 | Ant Design | 开箱即用，美观 |
| 音频处理 | node-wav + FFmpeg | 音频格式转换和处理 |
| 语音识别 | 科大讯飞实时语音转写API | 高精度，实时流式 |
| 通信协议 | WebSocket | 实时双向通信 |
| 文件保存 | Electron API | 原生文件保存 |

### 3.3 核心功能实现

#### 3.3.1 音频采集模块

**支持两种音频源：**

1. **麦克风音频**
```javascript
// 麦克风音频采集
const { desktopCapturer } = require('electron');

async function getMicrophoneStream() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true
    }
  });
  return stream;
}
```

2. **系统音频（本地视频）**
```javascript
// 系统音频采集（需要虚拟音频设备）
const { systemPreferences } = require('electron');

async function getSystemAudioStream() {
  // 方案1：使用虚拟音频设备
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: 'virtual-audio-device-id' },
      sampleRate: 16000,
      channelCount: 1
    }
  });
  return stream;

  // 方案2：使用Electron的音频捕获
  // 需要安装额外依赖，如node-speaker、node-record-lpcm16
}
```

#### 3.3.2 科大讯飞API集成

```javascript
// 科大讯飞实时语音转写客户端
class XunfeiASRClient {
  constructor(config) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.wsUrl = null;
    this.ws = null;
  }

  // 生成WebSocket URL
  generateUrl() {
    const host = 'rtasr.xfyun.cn';
    const path = '/v1/ws';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.apiSecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${this.apiId}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin));

    return `wss://${host}${path}?authorization=${authorization}&date=${date}&host=${host}`;
  }

  // 连接WebSocket
  connect() {
    return new Promise((resolve, reject) => {
      this.wsUrl = this.generateUrl();
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('科大讯飞WebSocket连接成功');
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket连接关闭');
      };
    });
  }

  // 发送音频数据
  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 将音频数据转换为PCM格式
      const pcmData = this.convertToPCM(audioData);
      this.ws.send(pcmData);
    }
  }

  // 处理识别结果
  handleMessage(data) {
    if (data.code === 0 && data.data) {
      const result = data.data.result;
      if (result && result.ws) {
        let text = '';
        result.ws.forEach(ws => {
          if (ws.cw) {
            ws.cw.forEach(cw => {
              text += cw.w;
            });
          }
        });

        if (this.onResult) {
          this.onResult({
            text: text,
            isEnd: data.data.result.pgs === 'rpl'
          });
        }
      }
    }
  }

  // 转换为PCM格式
  convertToPCM(audioData) {
    // 使用FFmpeg或其他库转换音频格式
    // 这里需要根据实际音频格式进行处理
    return audioData;
  }

  // 断开连接
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

#### 3.3.3 实时识别管理器

```javascript
// 实时识别管理器
class RealtimeRecognitionManager {
  constructor(config) {
    this.asrClient = new XunfeiASRClient(config);
    this.isRecording = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.fullText = '';
  }

  // 开始录音
  async startRecording(audioSource = 'microphone', onResult) {
    try {
      this.isRecording = true;
      this.fullText = '';

      // 连接科大讯飞API
      await this.asrClient.connect();
      this.asrClient.onResult = onResult;

      // 获取音频流
      if (audioSource === 'microphone') {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
      } else if (audioSource === 'system') {
        this.mediaStream = await this.getSystemAudioStream();
      }

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const audioData = event.inputBuffer.getChannelData(0);
        this.asrClient.sendAudio(audioData);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
      this.scriptProcessor = processor;

      return true;
    } catch (error) {
      console.error('开始录音失败:', error);
      throw error;
    }
  }

  // 停止录音
  async stopRecording() {
    this.isRecording = false;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.asrClient.disconnect();

    return this.fullText;
  }

  // 获取系统音频流
  async getSystemAudioStream() {
    // 使用虚拟音频设备
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInput = devices.find(device =>
      device.label.includes('VB-Audio') ||
      device.label.includes('Voicemeeter')
    );

    if (!audioInput) {
      throw new Error('未找到虚拟音频设备，请先安装VB-Cable或Voicemeeter');
    }

    return await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: audioInput.deviceId },
        sampleRate: 16000,
        channelCount: 1
      }
    });
  }
}
```

#### 3.3.4 文件保存模块

```javascript
// 文件保存工具（Electron）
const { dialog } = require('electron').remote;

class FileSaver {
  static async saveAsTxt(text, filename = null) {
    if (!filename) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      filename = `语音识别_${timestamp}.txt`;
    }

    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const fs = require('fs');
      fs.writeFileSync(result.filePath, text, 'utf-8');
      return true;
    }

    return false;
  }
}
```

### 3.4 前端界面实现

```javascript
import React, { useState } from 'react';
import { Button, Card, message, Space, Radio, Typography } from 'antd';
import { AudioOutlined, StopOutlined, SaveOutlined, DesktopOutlined } from '@ant-design/icons';

const { TextArea } = Typography;

const VoiceRecognitionApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [audioSource, setAudioSource] = useState('microphone');
  const [recognitionManager, setRecognitionManager] = useState(null);

  const handleStartRecording = async () => {
    try {
      const config = {
        appId: process.env.REACT_APP_XUNFEI_APP_ID,
        apiKey: process.env.REACT_APP_XUNFEI_API_KEY,
        apiSecret: process.env.REACT_APP_XUNFEI_API_SECRET
      };

      const manager = new RealtimeRecognitionManager(config);
      setRecognitionManager(manager);

      await manager.startRecording(audioSource, (result) => {
        setRecognizedText(prev => prev + result.text);
      });

      setIsRecording(true);
      message.success('开始录音');
    } catch (error) {
      message.error('开始录音失败: ' + error.message);
    }
  };

  const handleStopRecording = async () => {
    if (recognitionManager) {
      try {
        const finalText = await recognitionManager.stopRecording();
        setRecognizedText(finalText);
        setIsRecording(false);
        message.success('录音已停止');
      } catch (error) {
        message.error('停止录音失败: ' + error.message);
      }
    }
  };

  const handleSaveAsTxt = async () => {
    if (!recognizedText.trim()) {
      message.warning('没有可保存的内容');
      return;
    }
    const success = await FileSaver.saveAsTxt(recognizedText);
    if (success) {
      message.success('文件已保存');
    }
  };

  return (
    <Card title="实时语音识别" style={{ maxWidth: 800, margin: '50px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <span>音频源：</span>
          <Radio.Group
            value={audioSource}
            onChange={(e) => setAudioSource(e.target.value)}
            disabled={isRecording}
          >
            <Radio value="microphone">
              <AudioOutlined /> 麦克风
            </Radio>
            <Radio value="system">
              <DesktopOutlined /> 系统音频（本地视频）
            </Radio>
          </Radio.Group>
        </div>

        <TextArea
          value={recognizedText}
          onChange={(e) => setRecognizedText(e.target.value)}
          placeholder="识别结果将在这里显示..."
          autoSize={{ minRows: 10, maxRows: 20 }}
          readOnly={!isRecording}
        />

        <Space>
          <Button
            type="primary"
            icon={<AudioOutlined />}
            onClick={handleStartRecording}
            disabled={isRecording}
            size="large"
          >
            开始录音
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleStopRecording}
            disabled={!isRecording}
            size="large"
          >
            停止录音
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveAsTxt}
            disabled={!recognizedText.trim()}
            size="large"
          >
            保存为TXT
          </Button>
        </Space>

        {isRecording && (
          <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
            ● 录音中... ({audioSource === 'microphone' ? '麦克风' : '系统音频'})
          </div>
        )}

        {audioSource === 'system' && (
          <div style={{ color: '#faad14', fontSize: '12px' }}>
            提示：使用系统音频需要先安装虚拟音频设备（如VB-Cable或Voicemeeter）
          </div>
        )}
      </Space>
    </Card>
  );
};

export default VoiceRecognitionApp;
```

## 4. VB-Cable虚拟音频设备配置

### 4.1 VB-Cable简介

**VB-Cable** 是一款免费的虚拟音频设备软件，用于在Windows和macOS系统上创建虚拟音频线缆，实现音频输入输出的路由。

**特点：**
- ✅ 完全免费
- ✅ 跨平台支持（Windows/macOS）
- ✅ 轻量级，占用资源少
- ✅ 易于安装和配置
- ✅ 稳定可靠

### 4.2 下载和安装

**下载地址：** https://vb-audio.com/Cable/

**Windows系统安装步骤：**
1. 访问下载页面，选择"VB-CABLE Driver"（64-bit或32-bit）
2. 下载完成后，双击安装包
3. 按照安装向导完成安装
4. 重启电脑（可选，推荐）

**macOS系统安装步骤：**
1. 访问下载页面，选择"VB-CABLE Driver"（macOS）
2. 下载DMG文件
3. 打开DMG文件，双击.pkg安装包
4. 按照安装向导完成安装
5. 重启电脑（必须）

### 4.3 配置步骤

**Windows系统配置：**

1. **设置系统音频输出**
   - 右键点击任务栏音量图标，选择"声音设置"
   - 在"输出"设备列表中找到"VB-Audio Cable"
   - 选择"VB-Audio Cable"作为默认输出设备
   - 点击"设备属性"，确认采样率设置为16kHz或44.1kHz

2. **验证VB-Cable工作状态**
   - 播放一段音频或视频
   - 观察VB-Audio Cable的音量条是否跳动
   - 如果没有跳动，检查系统音频设置

3. **在应用中选择音频输入**
   - 打开语音识别应用
   - 在音频源选择中选择"VB-Audio Cable"
   - 开始录音，测试是否能捕获音频

**macOS系统配置：**

1. **设置系统音频输出**
   - 打开"系统偏好设置" → "声音"
   - 在"输出"标签页中找到"VB-Cable"
   - 选择"VB-Cable"作为输出设备
   - 确认采样率设置

2. **验证VB-Cable工作状态**
   - 播放一段音频或视频
   - 观察VB-Cable的音量指示器

3. **在应用中选择音频输入**
   - 打开语音识别应用
   - 在音频源选择中选择"VB-Cable"
   - 开始录音，测试是否能捕获音频

### 4.4 常见问题解决

**问题1：找不到VB-Audio Cable设备**
- 解决方案：重启电脑，重新安装驱动

**问题2：没有声音输出**
- 解决方案：检查是否同时选择了VB-Cable作为输入和输出，需要额外的扬声器设备

**问题3：音频质量差**
- 解决方案：在VB-Cable属性中调整采样率和位深度

**问题4：应用无法识别VB-Cable**
- 解决方案：检查应用权限，确保有音频访问权限

## 5. 项目结构

```
voice-recognition/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AudioRecorder.js
│   │   ├── XunfeiASRClient.js
│   │   ├── RealtimeRecognitionManager.js
│   │   └── FileSaver.js
│   ├── main/
│   │   └── index.js (Electron主进程)
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── .env
```

## 6. 开发计划

### 6.1 优化后的开发计划（2-3周）

| 阶段 | 任务 | 时间 | 交付物 |
|------|------|------|--------|
| 第1-2天 | 项目初始化（Electron + React） | 2天 | 项目框架 |
| 第3-5天 | 音频采集模块（麦克风+系统音频） | 3天 | 音频采集功能 |
| 第6-8天 | 科大讯飞API集成 | 3天 | 识别功能 |
| 第9-11天 | 前端界面开发 | 3天 | UI界面 |
| 第12-13天 | 虚拟音频设备集成 | 2天 | 系统音频支持 |
| 第14-15天 | 测试和优化 | 2天 | 完整版本 |

## 7. 成本估算

### 7.1 开发成本

| 项目 | 工时 | 单价 | 总成本 |
|------|------|------|--------|
| 前端开发 | 80h | ¥500/h | ¥40,000 |
| Electron开发 | 40h | ¥600/h | ¥24,000 |
| 测试 | 20h | ¥400/h | ¥8,000 |
| **合计** | **140h** | - | **¥72,000** |

### 7.2 运营成本（月）

| 项目 | 规格 | 单价 | 月成本 |
|------|------|------|--------|
| 科大讯飞API | 10小时 | ¥30 | ¥30 |
| 静态托管 | - | 免费 | ¥0 |
| **合计** | - | - | **¥30** |

## 8. 优势总结

### 8.1 相比原方案的改进

| 改进点 | 原方案 | 优化方案 |
|--------|--------|----------|
| 应用类型 | Web应用 | Electron桌面应用 |
| 音频源 | 仅麦克风 | 麦克风 + 系统音频 |
| 语音识别 | OpenAI Whisper | 科大讯飞 |
| 准确率 | 95% | 97-98% |
| 实时性 | 需自行实现 | 原生支持 |
| 国内访问 | 需VPN | 无需VPN |
| 成本 | ¥262/月 | ¥30/月 |

### 8.2 核心优势

1. ✅ **支持本地视频音频识别**：通过虚拟音频设备捕获系统音频
2. ✅ **更高识别精度**：科大讯飞准确率97-98%
3. ✅ **实时流式识别**：原生WebSocket支持，延迟更低
4. ✅ **国内访问友好**：无需VPN，速度快
5. ✅ **成本更低**：月运营成本仅¥30
6. ✅ **技术支持好**：中文文档完善，技术支持响应快

## 9. 风险与缓解

### 9.1 主要风险

| 风险 | 缓解措施 |
|------|----------|
| 虚拟音频设备配置复杂 | 提供详细的安装和配置指南 |
| Electron应用体积大 | 使用asar打包，优化体积 |
| 科大讯飞API配额限制 | 申请企业版，提高配额 |
| 系统音频兼容性问题 | 提供多种虚拟音频设备方案 |

### 9.2 应急预案

- 如果虚拟音频设备无法使用，提供仅麦克风模式
- 如果科大讯飞API不可用，切换到备用API（如阿里云）
- 如果Electron兼容性问题，提供Web版本降级方案

## 10. 总结

本优化方案解决了原方案的两个关键问题：

1. **音频捕获问题**：使用Electron + 虚拟音频设备，支持捕获本地视频音频
2. **语音识别问题**：使用科大讯飞API，准确率更高，实时性更好，成本更低

方案更加完善，能够满足"精确识别"和"支持本地视频"的需求。
