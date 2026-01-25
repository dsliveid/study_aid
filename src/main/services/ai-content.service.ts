import axios, { type AxiosInstance } from 'axios'

/**
 * AI Content Generation Service Configuration
 */
export interface AIContentConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Knowledge tree structure
 */
export interface KnowledgeTreeNode {
  title: string
  level: number
  importance: 'high' | 'medium' | 'low'
  children: KnowledgeTreeNode[]
}

export interface KnowledgeTreeResult {
  title: string
  structure: KnowledgeTreeNode[]
}

/**
 * Key point structure
 */
export interface KeyPoint {
  content: string
  importance: 'high' | 'medium' | 'low'
  location?: string
}

export interface KeyPointsResult {
  keyPoints: KeyPoint[]
}

/**
 * Difficult point structure
 */
export interface DifficultPoint {
  content: string
  explanation: string
  difficulty: 'high' | 'medium' | 'low'
  location?: string
}

export interface DifficultPointsResult {
  difficultPoints: DifficultPoint[]
}

/**
 * Chat message for API
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * API Request format
 */
interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * API Response format
 */
interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Error types for AI content generation
 */
export enum AIContentErrorCode {
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMIT = 'RATE_LIMIT',
  CONTEXT_TOO_LONG = 'CONTEXT_TOO_LONG',
  SERVICE_ERROR = 'SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE'
}

export class AIContentError extends Error {
  constructor(
    public code: AIContentErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'AIContentError'
  }
}

/**
 * AI Content Generation Service
 */
export class AIContentService {
  private config: AIContentConfig
  private axiosInstance: AxiosInstance

  // Default configuration
  private readonly DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'
  private readonly DEFAULT_MODEL = 'deepseek-chat'
  private readonly DEFAULT_MAX_TOKENS = 4096
  private readonly DEFAULT_TEMPERATURE = 0.7

  // Max content length (approximate, in characters)
  private readonly MAX_CONTENT_LENGTH = 50000

  constructor(config: AIContentConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || this.DEFAULT_BASE_URL,
      model: config.model || this.DEFAULT_MODEL,
      maxTokens: config.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: config.temperature || this.DEFAULT_TEMPERATURE
    }

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds timeout
    })
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new AIContentError(
        AIContentErrorCode.API_KEY_INVALID,
        'API密钥未配置或为空'
      )
    }
  }

  /**
   * Validate content length
   */
  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new AIContentError(
        AIContentErrorCode.SERVICE_ERROR,
        '文档内容不能为空'
      )
    }

    if (content.length > this.MAX_CONTENT_LENGTH) {
      throw new AIContentError(
        AIContentErrorCode.CONTEXT_TOO_LONG,
        `文档内容过长（${content.length} 字符），最大支持 ${this.MAX_CONTENT_LENGTH} 字符。请分段处理。`
      )
    }
  }

  /**
   * Call chat completion API
   */
  private async callChatCompletion(
    messages: ChatMessage[]
  ): Promise<string> {
    try {
      const request: ChatRequest = {
        model: this.config.model!,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false
      }

      const response = await this.axiosInstance.post<ChatResponse>(
        '/chat/completions',
        request
      )

      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content
      }

      throw new AIContentError(
        AIContentErrorCode.INVALID_RESPONSE,
        'API返回格式异常'
      )
    } catch (error: any) {
      if (error instanceof AIContentError) {
        throw error
      }

      // Handle axios errors
      if (error.response) {
        const status = error.response.status
        const message = error.response.data?.error?.message || error.message

        switch (status) {
          case 401:
            throw new AIContentError(
              AIContentErrorCode.API_KEY_INVALID,
              'API密钥无效，请检查配置',
              error
            )
          case 429:
            throw new AIContentError(
              AIContentErrorCode.RATE_LIMIT,
              '请求过于频繁，请稍后再试',
              error
            )
          case 400:
            throw new AIContentError(
              AIContentErrorCode.SERVICE_ERROR,
              `请求参数错误: ${message}`,
              error
            )
          default:
            throw new AIContentError(
              AIContentErrorCode.SERVICE_ERROR,
              `服务错误 (${status}): ${message}`,
              error
            )
        }
      }

      // Handle network errors
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new AIContentError(
          AIContentErrorCode.NETWORK_ERROR,
          '网络请求超时，请检查网络连接',
          error
        )
      }

      throw new AIContentError(
        AIContentErrorCode.NETWORK_ERROR,
        `网络错误: ${error.message}`,
        error
      )
    }
  }

  /**
   * Extract JSON from response
   */
  private extractJSON<T>(response: string): T {
    // Try to find JSON block in markdown code fence
    const jsonCodeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonCodeBlockMatch) {
      try {
        return JSON.parse(jsonCodeBlockMatch[1])
      } catch (e) {
        // Fall through to try direct parsing
      }
    }

    // Try to find JSON object in response
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0])
      } catch (e) {
        // Fall through
      }
    }

    // Try direct parsing
    try {
      return JSON.parse(response)
    } catch (e) {
      throw new AIContentError(
        AIContentErrorCode.INVALID_RESPONSE,
        '无法解析AI返回的JSON数据，请重试'
      )
    }
  }

  /**
   * Generate knowledge tree from document content
   */
  async generateKnowledgeTree(content: string): Promise<KnowledgeTreeResult> {
    this.validateConfig()
    this.validateContent(content)

    const prompt = `请为以下文档内容生成知识目录结构，要求：
1. 提取主要章节和主题
2. 标识每个主题的重要程度（高/中/low）
3. 以树状结构输出
4. 章节层级不超过4级
5. 输出为JSON格式

文档内容：
${content}

输出格式（JSON）：
{
  "title": "文档标题",
  "structure": [
    {
      "title": "章节标题",
      "level": 1,
      "importance": "high",
      "children": []
    }
  ]
}`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的文档分析助手，擅长提取文档结构和生成知识目录。请严格按照要求的JSON格式输出。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    const response = await this.callChatCompletion(messages)
    return this.extractJSON<KnowledgeTreeResult>(response)
  }

  /**
   * Extract key points from document content
   */
  async extractKeyPoints(content: string): Promise<KeyPointsResult> {
    this.validateConfig()
    this.validateContent(content)

    const prompt = `请为以下文档内容标记要点，要求：
1. 提取关键信息点
2. 每个要点用一句话概括
3. 按重要性排序（高/中/低）
4. 最多提取20个要点
5. 标注要点所在位置（章节或段落）
6. 输出为JSON格式

文档内容：
${content}

输出格式（JSON）：
{
  "keyPoints": [
    {
      "content": "要点内容",
      "importance": "high",
      "location": "章节/段落（可选）"
    }
  ]
}`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的文档分析助手，擅长提取文档要点。请严格按照要求的JSON格式输出。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    const response = await this.callChatCompletion(messages)
    return this.extractJSON<KeyPointsResult>(response)
  }

  /**
   * Annotate difficult points from document content
   */
  async annotateDifficultPoints(content: string): Promise<DifficultPointsResult> {
    this.validateConfig()
    this.validateContent(content)

    const prompt = `请为以下文档内容标注疑难点，要求：
1. 识别可能难以理解的内容（专业术语、复杂概念等）
2. 为每个疑难点提供详细说明
3. 说明要通俗易懂，适合初学者理解
4. 最多标注10个疑难点
5. 标注难点所在位置（章节或段落）
6. 输出为JSON格式

文档内容：
${content}

输出格式（JSON）：
{
  "difficultPoints": [
    {
      "content": "难点原文或关键词",
      "explanation": "详细说明",
      "difficulty": "high",
      "location": "章节/段落（可选）"
    }
  ]
}`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的教育助手，擅长识别学习难点并提供通俗易懂的解释。请严格按照要求的JSON格式输出。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    const response = await this.callChatCompletion(messages)
    return this.extractJSON<DifficultPointsResult>(response)
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIContentConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      baseUrl: config.baseUrl || this.config.baseUrl || this.DEFAULT_BASE_URL,
      model: config.model || this.config.model || this.DEFAULT_MODEL,
      maxTokens: config.maxTokens || this.config.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: config.temperature || this.config.temperature || this.DEFAULT_TEMPERATURE
    }

    // Update axios instance
    this.axiosInstance.defaults.baseURL = this.config.baseUrl
    if (this.config.apiKey) {
      this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<AIContentConfig, 'apiKey'> {
    return {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    }
  }
}

// Singleton instance
let aiContentServiceInstance: AIContentService | null = null

/**
 * Get AI content service singleton instance
 */
export function getAIContentService(config?: AIContentConfig): AIContentService {
  if (!aiContentServiceInstance && config) {
    aiContentServiceInstance = new AIContentService(config)
  }

  if (!aiContentServiceInstance) {
    throw new Error('AI content service not initialized. Please provide configuration.')
  }

  return aiContentServiceInstance
}

/**
 * Initialize AI content service with configuration
 */
export function initializeAIContentService(config: AIContentConfig): AIContentService {
  aiContentServiceInstance = new AIContentService(config)
  return aiContentServiceInstance
}

/**
 * Reset AI content service instance
 */
export function resetAIContentService(): void {
  aiContentServiceInstance = null
}
