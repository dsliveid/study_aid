/**
 * Speech Recognition Service
 * Integrates with Xunfei (iFlytek) Speech Recognition API
 */

import { EventEmitter } from 'events'
import WebSocket from 'ws'
import { createHmac } from 'crypto'

/**
 * Speech Recognition Configuration
 */
export interface SpeechRecognitionConfig {
  apiKey: string
  appId: string
  apiSecret?: string
  apiId?: string
  language?: 'zh_cn' | 'en_us'
  accent?: string
  domain?: 'iat' | 'medical' | 'finance'
  format?: 'audio/L16;rate=16000' | 'audio/L16;rate=8000'
}

/**
 * Recognition Result
 */
export interface RecognitionResult {
  text: string
  isFinal: boolean
  confidence: number
  startTime?: number
  endTime?: number
}

/**
 * Recognition Status
 */
export enum RecognitionStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECOGNIZING = 'recognizing',
  PAUSED = 'paused',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

/**
 * Error Codes
 */
export enum SpeechErrorCode {
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTH_FAILED = 'AUTH_FAILED',
  AUDIO_ERROR = 'AUDIO_ERROR',
  SERVICE_ERROR = 'SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT'
}

export class SpeechRecognitionError extends Error {
  constructor(
    public code: SpeechErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'SpeechRecognitionError'
  }
}

/**
 * Generate authentication parameter for Xunfei
 */
function generateXunfeiAuthParams(config: SpeechRecognitionConfig): string {
  const host = 'iat-api.xfyun.cn'
  const path = '/v2/iat'
  const date = new Date().toUTCString()

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`
  const signatureSha = createHmac('sha256', config.apiSecret || config.apiKey)
    .update(signatureOrigin)
    .digest('base64')

  const authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`
  const authorization = Buffer.from(authorizationOrigin).toString('base64')

  return `authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`
}

/**
 * Speech Recognition Service
 */
export class SpeechRecognitionService extends EventEmitter {
  private config: SpeechRecognitionConfig
  private ws: WebSocket | null = null
  private status: RecognitionStatus = RecognitionStatus.IDLE
  private recognitionResults: string[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectTimeout: NodeJS.Timeout | null = null

  // Audio processing
  private audioContext: any = null
  private isRecording = false
  private isFirstAudioFrame = true

  // Configuration defaults
  private readonly DEFAULT_HOST = 'wss://iat-api.xfyun.cn/v2/iat'
  private readonly RECONNECT_DELAY = 2000

  constructor(config: SpeechRecognitionConfig) {
    super()
    this.config = config
    this.validateConfig()
  }

  /**
   * Validate configuration with detailed error messages
   */
  private validateConfig(): void {
    const missingFields: string[] = []
    const configDetails: string[] = []

    // Check API Key
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      missingFields.push('API密钥 (apiKey)')
    } else {
      configDetails.push(`apiKey: ${this.config.apiKey.substring(0, 8)}...`)
    }

    // Check App ID
    if (!this.config.appId || this.config.appId.trim() === '') {
      missingFields.push('应用ID (appId)')
    } else {
      configDetails.push(`appId: ${this.config.appId}`)
    }

    // Check API Secret (required for Xunfei)
    if (!this.config.apiSecret || this.config.apiSecret.trim() === '') {
      missingFields.push('API密钥Secret (apiSecret)')
    } else {
      configDetails.push(`apiSecret: ${this.config.apiSecret.substring(0, 8)}...`)
    }

    // Log configuration details
    console.log('[SpeechRecognition] 配置验证:', {
      hasApiKey: !!this.config.apiKey,
      hasAppId: !!this.config.appId,
      hasApiSecret: !!this.config.apiSecret,
      provider: 'Xunfei (科大讯飞)',
      config: configDetails
    })

    if (missingFields.length > 0) {
      const errorMessage = `语音识别服务配置不完整\n\n缺失配置项:\n${missingFields.map(f => `  • ${f}`).join('\n')}\n\n请按以下步骤配置:\n1. 打开"设置"页面\n2. 进入"AI 服务"选项卡\n3. 在"语音识别服务"部分填写完整信息\n4. 科大讯飞服务需要: API密钥、应用ID、API密钥Secret`

      console.error('[SpeechRecognition] 配置验证失败:', {
        missingFields,
        allFields: ['apiKey', 'appId', 'apiSecret'],
        provider: 'Xunfei (科大讯飞)'
      })

      throw new SpeechRecognitionError(
        SpeechErrorCode.CONFIG_INVALID,
        errorMessage
      )
    }

    console.log('[SpeechRecognition] 配置验证通过')
  }

  /**
   * Get WebSocket URL with authentication
   */
  private getWebSocketUrl(): string {
    const authParams = generateXunfeiAuthParams(this.config)
    return `${this.DEFAULT_HOST}?${authParams}`
  }

  /**
   * Connect to speech recognition service
   */
  async connect(): Promise<void> {
    if (this.status === RecognitionStatus.CONNECTED || this.status === RecognitionStatus.RECOGNIZING) {
      console.log('[SpeechRecognition] 已连接，跳过连接请求')
      return
    }

    console.log('[SpeechRecognition] 开始连接语音识别服务...', {
      provider: 'Xunfei (科大讯飞)',
      host: this.DEFAULT_HOST,
      status: this.status
    })

    this.status = RecognitionStatus.CONNECTING
    this.emit('statusChange', this.status)

    return new Promise((resolve, reject) => {
      try {
        const url = this.getWebSocketUrl()

        console.log('[SpeechRecognition] WebSocket 连接参数:', {
          url: url.split('?')[0], // 隐藏认证参数
          hasAuthParams: url.includes('authorization'),
          timestamp: new Date().toISOString()
        })

        this.ws = new WebSocket(url)

        this.ws.on('open', () => {
          console.log('[SpeechRecognition] WebSocket 连接成功 ✓', {
            timestamp: new Date().toISOString(),
            status: 'CONNECTED'
          })
          this.status = RecognitionStatus.CONNECTED
          this.reconnectAttempts = 0
          this.emit('statusChange', this.status)
          this.emit('connected')
          resolve()
        })

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data)
        })

        this.ws.on('error', (error: Error) => {
          console.error('[SpeechRecognition] WebSocket 错误 ✗', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          })
          this.handleError(new SpeechRecognitionError(
            SpeechErrorCode.CONNECTION_FAILED,
            '连接失败',
            error
          ))
          reject(error)
        })

        this.ws.on('close', () => {
          console.log('[SpeechRecognition] WebSocket 连接关闭', {
            wasConnected: this.status === RecognitionStatus.CONNECTED,
            timestamp: new Date().toISOString()
          })
          this.handleDisconnect()
          if (this.status === RecognitionStatus.CONNECTING) {
            reject(new SpeechRecognitionError(
              SpeechErrorCode.CONNECTION_FAILED,
              '连接关闭'
            ))
          }
        })
      } catch (error: any) {
        this.handleError(error)
        reject(error)
      }
    })
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString())

      // Log all messages for debugging
      console.log('[SpeechRecognition] 收到服务器消息:', {
        code: message.code,
        hasData: !!message.data,
        hasResult: !!(message.data && message.data.result),
        message: message.message || '',
        sid: message.sid
      })

      if (message.code !== 0) {
        this.handleError(new SpeechRecognitionError(
          SpeechErrorCode.SERVICE_ERROR,
          `服务错误: ${message.message || '未知错误'}`
        ))
        return
      }

      if (message.data && message.data.result) {
        const result = message.data.result

        console.log('[SpeechRecognition] 识别结果详情:', {
          hasWs: !!result.ws,
          pgs: result.pgs,
          sn: result.sn,
          text: result.ws ? this.buildTextFromResult(result) : ''
        })

        if (result.ws) {
          // Build text from word segments
          let text = this.buildTextFromResult(result)

          const recognitionResult: RecognitionResult = {
            text,
            isFinal: result.pgs === 'rpl',
            confidence: result.sc || 0,
            startTime: result.sn ? result.sn * 100 : undefined,
            endTime: result.sn ? (result.sn + 1) * 100 : undefined
          }

          console.log('[SpeechRecognition] 发出识别结果事件:', {
            text,
            isFinal: recognitionResult.isFinal,
            confidence: recognitionResult.confidence
          })

          this.emit('result', recognitionResult)

          if (recognitionResult.isFinal) {
            this.recognitionResults.push(text)
            console.log('[SpeechRecognition] 添加最终结果，累计:', {
              currentText: text,
              allText: this.recognitionResults.join(''),
              count: this.recognitionResults.length
            })
            this.emit('finalResult', {
              text: this.recognitionResults.join(''),
              allResults: [...this.recognitionResults]
            })
          }
        }
      }
    } catch (error) {
      console.error('[SpeechRecognition] 解析消息失败:', error)
    }
  }

  /**
   * Build text from recognition result
   */
  private buildTextFromResult(result: any): string {
    let text = ''
    for (const ws of result.ws) {
      for (const cw of ws.cw) {
        text += cw.w
      }
    }
    return text
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(): void {
    const wasConnected = this.status === RecognitionStatus.CONNECTED || this.status === RecognitionStatus.RECOGNIZING
    this.status = RecognitionStatus.DISCONNECTED
    this.ws = null
    this.emit('statusChange', this.status)

    if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.emit('reconnecting', this.reconnectAttempts)

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          this.handleError(error)
        })
      }, this.RECONNECT_DELAY)
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached')
    }
  }

  /**
   * Handle error
   */
  private handleError(error: SpeechRecognitionError): void {
    this.status = RecognitionStatus.ERROR
    this.emit('statusChange', this.status)
    this.emit('error', error)
  }

  /**
   * Start recognition
   */
  async startRecognition(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }

    this.isRecording = true
    this.isFirstAudioFrame = true
    this.status = RecognitionStatus.RECOGNIZING
    this.recognitionResults = []

    console.log('[SpeechRecognition] 开始识别', {
      timestamp: new Date().toISOString()
    })

    this.emit('statusChange', this.status)
    this.emit('recognitionStarted')
  }

  /**
   * Send audio data
   */
  sendAudioData(audioBuffer: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new SpeechRecognitionError(
        SpeechErrorCode.CONNECTION_FAILED,
        '未连接到服务'
      )
    }

    if (!this.isRecording) {
      return
    }

    // Determine frame status: 1 = first frame, 2 = continue, 3 = last frame
    let frameStatus = 2 // continue
    if (this.isFirstAudioFrame) {
      frameStatus = 1 // first frame
      this.isFirstAudioFrame = false
    }

    // Send audio data
    const frame = {
      data: {
        status: frameStatus,
        format: this.config.format || 'audio/L16;rate=16000',
        audio: audioBuffer.toString('base64'),
        encoding: 'raw'
      }
    }

    this.ws.send(JSON.stringify(frame))

    console.log('[SpeechRecognition] 发送音频帧', {
      status: frameStatus,
      dataSize: audioBuffer.length,
      isFirst: this.isFirstAudioFrame
    })
  }

  /**
   * Stop recognition
   */
  stopRecognition(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    console.log('[SpeechRecognition] 停止识别', {
      timestamp: new Date().toISOString(),
      resultCount: this.recognitionResults.length
    })

    this.isRecording = false
    this.status = RecognitionStatus.CONNECTED
    this.emit('statusChange', this.status)
    this.emit('recognitionStopped')

    // Send end frame (status = 3)
    const endFrame = {
      data: {
        status: 3, // End frame
        format: this.config.format || 'audio/L16;rate=16000',
        audio: '',
        encoding: 'raw'
      }
    }

    this.ws.send(JSON.stringify(endFrame))

    console.log('[SpeechRecognition] 发送结束帧 (status=3)')

    // Log final results
    const finalText = this.recognitionResults.join('')
    console.log('[SpeechRecognition] 当前识别结果:', {
      text: finalText,
      resultCount: this.recognitionResults.length
    })
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isRecording = false

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.status = RecognitionStatus.IDLE
    this.recognitionResults = []
    this.emit('statusChange', this.status)
  }

  /**
   * Get current status
   */
  getStatus(): RecognitionStatus {
    return this.status
  }

  /**
   * Get recognition results
   */
  getResults(): string {
    return this.recognitionResults.join('')
  }

  /**
   * Clear results
   */
  clearResults(): void {
    this.recognitionResults = []
  }
}

// Singleton instance
let speechRecognitionServiceInstance: SpeechRecognitionService | null = null

/**
 * Get speech recognition service singleton instance
 */
export function getSpeechRecognitionService(config?: SpeechRecognitionConfig): SpeechRecognitionService {
  if (!speechRecognitionServiceInstance && config) {
    speechRecognitionServiceInstance = new SpeechRecognitionService(config)
  }

  if (!speechRecognitionServiceInstance) {
    throw new Error('Speech recognition service not initialized. Please provide configuration.')
  }

  return speechRecognitionServiceInstance
}

/**
 * Initialize speech recognition service with configuration
 */
export function initializeSpeechRecognitionService(config: SpeechRecognitionConfig): SpeechRecognitionService {
  speechRecognitionServiceInstance = new SpeechRecognitionService(config)
  return speechRecognitionServiceInstance
}

/**
 * Reset speech recognition service instance
 */
export function resetSpeechRecognitionService(): void {
  if (speechRecognitionServiceInstance) {
    speechRecognitionServiceInstance.disconnect()
  }
  speechRecognitionServiceInstance = null
}
