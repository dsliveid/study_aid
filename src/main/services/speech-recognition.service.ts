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

  // Configuration defaults
  private readonly DEFAULT_HOST = 'wss://iat-api.xfyun.cn/v2/iat'
  private readonly RECONNECT_DELAY = 2000

  constructor(config: SpeechRecognitionConfig) {
    super()
    this.config = config
    this.validateConfig()
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new SpeechRecognitionError(
        SpeechErrorCode.CONFIG_INVALID,
        'API密钥未配置'
      )
    }

    if (!this.config.appId || this.config.appId.trim() === '') {
      throw new SpeechRecognitionError(
        SpeechErrorCode.CONFIG_INVALID,
        '应用ID未配置'
      )
    }
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
      return
    }

    this.status = RecognitionStatus.CONNECTING
    this.emit('statusChange', this.status)

    return new Promise((resolve, reject) => {
      try {
        const url = this.getWebSocketUrl()
        this.ws = new WebSocket(url)

        this.ws.on('open', () => {
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
          console.error('WebSocket error:', error)
          this.handleError(new SpeechRecognitionError(
            SpeechErrorCode.CONNECTION_FAILED,
            '连接失败',
            error
          ))
          reject(error)
        })

        this.ws.on('close', () => {
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

      if (message.code !== 0) {
        this.handleError(new SpeechRecognitionError(
          SpeechErrorCode.SERVICE_ERROR,
          `服务错误: ${message.message || '未知错误'}`
        ))
        return
      }

      if (message.data && message.data.result) {
        const result = message.data.result

        if (result.ws) {
          // Build text from word segments
          let text = ''
          for (const ws of result.ws) {
            for (const cw of ws.cw) {
              text += cw.w
            }
          }

          const recognitionResult: RecognitionResult = {
            text,
            isFinal: result.pgs === 'rpl',
            confidence: result.sc || 0,
            startTime: result.sn ? result.sn * 100 : undefined,
            endTime: result.sn ? (result.sn + 1) * 100 : undefined
          }

          this.emit('result', recognitionResult)

          if (recognitionResult.isFinal) {
            this.recognitionResults.push(text)
            this.emit('finalResult', {
              text: this.recognitionResults.join(''),
              allResults: [...this.recognitionResults]
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
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
    this.status = RecognitionStatus.RECOGNIZING
    this.recognitionResults = []
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

    // Send audio data
    const frame = {
      data: {
        status: this.isRecording ? 1 : 2, // 1: first frame, 2: continue, 3: last frame
        format: this.config.format || 'audio/L16;rate=16000',
        audio: audioBuffer.toString('base64'),
        encoding: 'raw'
      }
    }

    this.ws.send(JSON.stringify(frame))
  }

  /**
   * Stop recognition
   */
  stopRecognition(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.isRecording = false
    this.status = RecognitionStatus.CONNECTED
    this.emit('statusChange', this.status)
    this.emit('recognitionStopped')

    // Send end frame
    const endFrame = {
      data: {
        status: 2, // End frame
        format: this.config.format || 'audio/L16;rate=16000',
        audio: '',
        encoding: 'raw'
      }
    }

    this.ws.send(JSON.stringify(endFrame))
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
