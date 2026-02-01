import axios, { type AxiosInstance } from 'axios'

/**
 * Image Recognition Service
 * Supports Baidu OCR for text extraction and Qwen VL for image understanding
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface ImageRecognitionConfig {
  // OCR Configuration
  ocr?: {
    provider: 'baidu' | 'tencent' | 'qwen'
    baidu?: {
      apiKey: string
      secretKey: string
    }
  }
  // Vision/Image Understanding Configuration
  vision?: {
    provider: 'qwen' | 'openai'
    qwen?: {
      apiKey: string
      model: 'qwen-vl-plus' | 'qwen-vl-max'
    }
  }
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * OCR Text Recognition Result
 */
export interface OCRResult {
  success: boolean
  text: string
  confidence?: number
  wordsResult?: Array<{
    words: string
    confidence?: number
  }>
  error?: string
}

/**
 * Image Understanding Result
 */
export interface ImageUnderstandingResult {
  success: boolean
  description: string
  keyPoints?: string[]
  error?: string
}

/**
 * Combined Recognition Result
 */
export interface RecognitionResult {
  ocr?: OCRResult
  understanding?: ImageUnderstandingResult
}

// ============================================================================
// Baidu OCR Types
// ============================================================================

interface BaiduOCRRequest {
  image: string // Base64 encoded image
  language_type?: 'CHN_ENG' | 'ENG' | 'JAP' | 'KOR' | 'FRE' | 'GER' | 'ITA' | 'POR' | 'RUS' | 'SPA'
  detect_direction?: boolean
  paragraph?: boolean
  probability?: boolean
}

interface BaiduOCRResponse {
  words_result: Array<{
    words: string
    probability?: {
      average: number
      variance: number
      min: number
    }
  }>
  words_result_num: number
  log_id: number
  error_code?: string
  error_msg?: string
}

interface BaiduAuthTokenResponse {
  access_token: string
  error?: string
  error_description?: string
}

// ============================================================================
// Qwen VL Types
// ============================================================================

interface QwenVLMessage {
  role: 'system' | 'user'
  content: Array<{
    image?: string
    text?: string
  }>
}

interface QwenVLRequest {
  model: string
  input: {
    messages: QwenVLMessage[]
  }
  parameters?: {
    result_format?: 'message' | 'text'
    max_tokens?: number
    temperature?: number
  }
}

interface QwenVLResponse {
  output: {
    choices: Array<{
      message: {
        content: Array<{
          text: string
        }>
      }
      finish_reason: string
    }>
  }
  usage: {
    input_tokens: number
    output_tokens: number
    image_tokens: number
  }
  error?: string
  message?: string
}

// ============================================================================
// Service Implementation
// ============================================================================

class ImageRecognitionService {
  private config: ImageRecognitionConfig | null = null
  private ocrAxios: AxiosInstance | null = null
  private visionAxios: AxiosInstance | null = null
  private baiduAccessToken: string | null = null
  private baiduTokenExpiry: number = 0

  /**
   * Initialize the image recognition service with configuration
   */
  async initialize(config: ImageRecognitionConfig): Promise<void> {
    console.log('[ImageRecognitionService] 开始初始化服务...')

    // Validate configuration
    this.validateConfig(config)

    this.config = config

    // Initialize Baidu OCR if configured
    if (config.ocr?.baidu) {
      console.log('[ImageRecognitionService] 初始化百度 OCR...', {
        hasApiKey: !!config.ocr.baidu.apiKey,
        hasSecretKey: !!config.ocr.baidu.secretKey
      })

      this.ocrAxios = axios.create({
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      // Get access token for Baidu OCR
      await this.getBaiduAccessToken()

      console.log('[ImageRecognitionService] 百度 OCR 初始化成功 ✓')
    }

    // Initialize Qwen VL if configured
    if (config.vision?.qwen) {
      console.log('[ImageRecognitionService] 初始化通义千问 VL...', {
        hasApiKey: !!config.vision.qwen.apiKey,
        model: config.vision.qwen.model
      })

      this.visionAxios = axios.create({
        baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.vision.qwen.apiKey}`
        }
      })

      console.log('[ImageRecognitionService] 通义千问 VL 初始化成功 ✓')
    }

    console.log('[ImageRecognitionService] 服务初始化完成')
  }

  /**
   * Validate configuration with detailed error messages
   */
  private validateConfig(config: ImageRecognitionConfig): void {
    const missingFields: string[] = []
    const warnings: string[] = []

    // Check OCR configuration
    if (config.ocr) {
      if (config.ocr.provider === 'baidu') {
        if (!config.ocr.baidu?.apiKey) {
          missingFields.push('OCR - 百度 API 密钥')
        }
        if (!config.ocr.baidu?.secretKey) {
          missingFields.push('OCR - 百度 Secret Key')
        }
      }
    } else {
      warnings.push('OCR 服务未配置')
    }

    // Check Vision configuration
    if (config.vision) {
      if (config.vision.provider === 'qwen') {
        if (!config.vision.qwen?.apiKey) {
          missingFields.push('图像理解 - 通义千问 API 密钥')
        }
      }
    } else {
      warnings.push('图像理解服务未配置')
    }

    // Log configuration details
    console.log('[ImageRecognitionService] 配置验证:', {
      hasOCR: !!config.ocr,
      ocrProvider: config.ocr?.provider,
      hasVision: !!config.vision,
      visionProvider: config.vision?.provider,
      warnings
    })

    if (missingFields.length > 0) {
      const errorMessage = `图像识别服务配置不完整\n\n缺失配置项:\n${missingFields.map(f => `  • ${f}`).join('\n')}\n\n请按以下步骤配置:\n1. 打开"设置"页面\n2. 进入"AI 服务"选项卡\n3. 在"图像识别服务"部分填写完整信息\n4. 百度OCR需要: API 密钥、Secret Key\n5. 通义千问VL需要: API 密钥\n6. 保存设置后重新连接`

      console.error('[ImageRecognitionService] 配置验证失败:', {
        missingFields,
        warnings,
        config
      })

      throw new Error(errorMessage)
    }

    if (warnings.length > 0) {
      console.warn('[ImageRecognitionService] 配置警告:', warnings)
    }

    console.log('[ImageRecognitionService] 配置验证通过')
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<ImageRecognitionConfig>): Promise<void> {
    if (config.ocr?.baidu) {
      this.config = { ...this.config, ocr: config.ocr }
      await this.getBaiduAccessToken(true)
    }
    if (config.vision?.qwen) {
      this.config = { ...this.config, vision: config.vision }
      if (this.visionAxios && config.vision.qwen) {
        this.visionAxios.defaults.headers['Authorization'] = `Bearer ${config.vision.qwen.apiKey}`
      }
    }
  }

  // ========================================================================
  // Baidu OCR Methods
  // ========================================================================

  /**
   * Get Baidu OAuth access token
   */
  private async getBaiduAccessToken(forceRefresh = false): Promise<void> {
    if (!this.config?.ocr?.baidu) {
      throw new Error('Baidu OCR configuration not found')
    }

    // Check if token is still valid (expires in 30 days)
    if (!forceRefresh && this.baiduAccessToken && Date.now() < this.baiduTokenExpiry) {
      return
    }

    try {
      const { apiKey, secretKey } = this.config.ocr.baidu
      const response = await axios.get<BaiduAuthTokenResponse>(
        'https://aip.baidubce.com/oauth/2.0/token',
        {
          params: {
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: secretKey
          }
        }
      )

      if (response.data.error) {
        throw new Error(`Baidu auth error: ${response.data.error_description}`)
      }

      this.baiduAccessToken = response.data.access_token
      // Set expiry to 29 days from now (token expires in 30 days)
      this.baiduTokenExpiry = Date.now() + 29 * 24 * 60 * 60 * 1000
    } catch (error: any) {
      throw new Error(`Failed to get Baidu access token: ${error.message}`)
    }
  }

  /**
   * Perform OCR text extraction using Baidu OCR
   */
  async recognizeText(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.config?.ocr?.baidu || !this.baiduAccessToken) {
      return {
        success: false,
        text: '',
        error: 'Baidu OCR not configured'
      }
    }

    try {
      // Convert image to base64
      const base64Image = imageBuffer.toString('base64')

      const response = await this.ocrAxios!.post<BaiduOCRResponse>(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${this.baiduAccessToken}`,
        {
          image: base64Image,
          language_type: 'CHN_ENG',
          detect_direction: true,
          probability: true
        }
      )

      if (response.data.error_code) {
        return {
          success: false,
          text: '',
          error: `Baidu OCR error: ${response.data.error_msg}`
        }
      }

      // Extract all text
      const allText = response.data.words_result.map(item => item.words).join('\n')

      // Calculate average confidence
      const confidences = response.data.words_result
        .map(item => item.probability?.average)
        .filter(Boolean) as number[]
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : undefined

      return {
        success: true,
        text: allText,
        confidence: avgConfidence,
        wordsResult: response.data.words_result.map(item => ({
          words: item.words,
          confidence: item.probability?.average
        }))
      }
    } catch (error: any) {
      return {
        success: false,
        text: '',
        error: `OCR request failed: ${error.message}`
      }
    }
  }

  // ========================================================================
  // Qwen VL Methods
  // ========================================================================

  /**
   * Understand image content using Qwen VL
   */
  async understandImage(imageBuffer: Buffer, prompt?: string): Promise<ImageUnderstandingResult> {
    if (!this.config?.vision?.qwen) {
      return {
        success: false,
        description: '',
        error: 'Qwen VL not configured'
      }
    }

    try {
      const model = this.config.vision.qwen.model || 'qwen-vl-plus'
      const userPrompt = prompt || '请详细描述这张图片的内容，包括其中的文字、主要元素和关键信息。'

      // Convert image to base64
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

      const request: QwenVLRequest = {
        model,
        input: {
          messages: [
            {
              role: 'system',
              content: [
                {
                  text: '你是一个专业的图像分析助手，擅长识别图片中的文字和理解图像内容。'
                }
              ]
            },
            {
              role: 'user',
              content: [
                {
                  image: base64Image
                },
                {
                  text: userPrompt
                }
              ]
            }
          ]
        },
        parameters: {
          result_format: 'message',
          max_tokens: 2000,
          temperature: 0.7
        }
      }

      const response = await this.visionAxios!.post<QwenVLResponse>('/generation', request)

      if (response.data.error || response.data.message) {
        return {
          success: false,
          description: '',
          error: `Qwen VL error: ${response.data.error || response.data.message}`
        }
      }

      const content = response.data.output.choices[0]?.message.content[0]?.text || ''

      // Extract key points if the response contains structured information
      const keyPoints = this.extractKeyPoints(content)

      return {
        success: true,
        description: content,
        keyPoints
      }
    } catch (error: any) {
      return {
        success: false,
        description: '',
        error: `Image understanding failed: ${error.message}`
      }
    }
  }

  /**
   * Extract key points from description text
   */
  private extractKeyPoints(text: string): string[] | undefined {
    // Look for numbered lists or bullet points
    const patterns = [
      /(?:第\s*\d+\s*[点项])?\s*([^\n]+)/g,
      /^\s*[-•]\s*(.+)/gm,
      /^\s*\d+[.、]\s*(.+)/gm
    ]

    const points: string[] = []

    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        points.push(...matches.map(m => m.trim()).filter(m => m.length > 2))
      }
    }

    return points.length > 0 ? points.slice(0, 10) : undefined
  }

  // ========================================================================
  // Combined Methods
  // ========================================================================

  /**
   * Perform both OCR and image understanding on an image
   */
  async recognize(imageBuffer: Buffer, options?: {
    enableOCR?: boolean
    enableUnderstanding?: boolean
    understandingPrompt?: string
  }): Promise<RecognitionResult> {
    const result: RecognitionResult = {}

    const enableOCR = options?.enableOCR !== false
    const enableUnderstanding = options?.enableUnderstanding !== false

    // Perform OCR
    if (enableOCR && this.config?.ocr?.baidu) {
      result.ocr = await this.recognizeText(imageBuffer)
    }

    // Perform image understanding
    if (enableUnderstanding && this.config?.vision?.qwen) {
      result.understanding = await this.understandImage(imageBuffer, options?.understandingPrompt)
    }

    return result
  }

  /**
   * Test the configuration
   */
  async test(config: ImageRecognitionConfig): Promise<{
    ocr?: { success: boolean; error?: string }
    vision?: { success: boolean; error?: string }
  }> {
    const result: {
      ocr?: { success: boolean; error?: string }
      vision?: { success: boolean; error?: string }
    } = {}

    // Test Baidu OCR
    if (config.ocr?.baidu) {
      try {
        const tempAxios = axios.create({ timeout: 10000 })
        const response = await tempAxios.get<BaiduAuthTokenResponse>(
          'https://aip.baidubce.com/oauth/2.0/token',
          {
            params: {
              grant_type: 'client_credentials',
              client_id: config.ocr.baidu.apiKey,
              client_secret: config.ocr.baidu.secretKey
            }
          }
        )
        result.ocr = {
          success: !!response.data.access_token,
          error: response.data.error_description
        }
      } catch (error: any) {
        result.ocr = {
          success: false,
          error: error.message
        }
      }
    }

    // Test Qwen VL (simple validation - no actual API call to save quota)
    if (config.vision?.qwen) {
      result.vision = {
        success: !!config.vision.qwen.apiKey,
        error: config.vision.qwen.apiKey ? undefined : 'API key is required'
      }
    }

    return result
  }
}

// ============================================================================
// Export
// ============================================================================

export const imageRecognitionService = new ImageRecognitionService()
