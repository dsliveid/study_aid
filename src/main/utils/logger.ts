import { app } from 'electron'
import { join } from 'path'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { format } from 'util'

/**
 * Logger utility for saving console logs to file
 */
class Logger {
  private logStream: NodeJS.WritableStream | null = null
  private errorStream: NodeJS.WritableStream | null = null
  private originalConsole: {
    log: typeof console.log
    info: typeof console.info
    warn: typeof console.warn
    error: typeof console.error
    debug: typeof console.debug
  }

  constructor() {
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    }
  }

  /**
   * Initialize logger with log file paths
   */
  init() {
    const logsDir = join(app.getPath('userData'), 'logs')

    // Create logs directory if it doesn't exist
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
    }

    // Create log streams with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const logFile = join(logsDir, `main-${timestamp}.log`)
    const errorFile = join(logsDir, `error-${timestamp}.log`)

    this.logStream = createWriteStream(logFile, { flags: 'a' })
    this.errorStream = createWriteStream(errorFile, { flags: 'a' })

    // Override console methods
    this.overrideConsole()

    // Log startup
    this.log('='.repeat(60))
    this.log(`Application started at ${new Date().toISOString()}`)
    this.log(`Log file: ${logFile}`)
    this.log(`Error file: ${errorFile}`)
    this.log('='.repeat(60))
  }

  /**
   * Override console methods to write to files
   */
  private overrideConsole() {
    const self = this

    console.log = function (...args: any[]) {
      self.originalConsole.log(...args)
      self.writeToFile(self.logStream, 'LOG', args)
    }

    console.info = function (...args: any[]) {
      self.originalConsole.info(...args)
      self.writeToFile(self.logStream, 'INFO', args)
    }

    console.warn = function (...args: any[]) {
      self.originalConsole.warn(...args)
      self.writeToFile(self.logStream, 'WARN', args)
    }

    console.error = function (...args: any[]) {
      self.originalConsole.error(...args)
      self.writeToFile(self.errorStream, 'ERROR', args)
      // Also write errors to main log
      self.writeToFile(self.logStream, 'ERROR', args)
    }

    console.debug = function (...args: any[]) {
      self.originalConsole.debug(...args)
      self.writeToFile(self.logStream, 'DEBUG', args)
    }
  }

  /**
   * Write log entry to file with timestamp and level
   */
  private writeToFile(
    stream: NodeJS.WritableStream | null,
    level: string,
    args: any[]
  ) {
    if (!stream) return

    try {
      const timestamp = new Date().toISOString()
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') {
            return arg
          } else if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack}`
          } else {
            try {
              return format(arg)
            } catch {
              return String(arg)
            }
          }
        })
        .join(' ')

      stream.write(`[${timestamp}] [${level}] ${message}\n`)
    } catch (error) {
      // Silently fail to avoid infinite loop
    }
  }

  /**
   * Log a message
   */
  log(...args: any[]) {
    console.log(...args)
  }

  /**
   * Log an info message
   */
  info(...args: any[]) {
    console.info(...args)
  }

  /**
   * Log a warning
   */
  warn(...args: any[]) {
    console.warn(...args)
  }

  /**
   * Log an error
   */
  error(...args: any[]) {
    console.error(...args)
  }

  /**
   * Log debug message
   */
  debug(...args: any[]) {
    console.debug(...args)
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.log('Application shutting down...')
    this.log('='.repeat(60))

    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }

    if (this.errorStream) {
      this.errorStream.end()
      this.errorStream = null
    }

    // Restore original console methods
    console.log = this.originalConsole.log
    console.info = this.originalConsole.info
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    console.debug = this.originalConsole.debug
  }

  /**
   * Get logs directory path
   */
  getLogsDir(): string {
    return join(app.getPath('userData'), 'logs')
  }
}

// Singleton instance
let loggerInstance: Logger | null = null

/**
 * Get logger singleton instance
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger()
  }
  return loggerInstance
}

/**
 * Initialize logger
 */
export function initLogger() {
  const logger = getLogger()
  logger.init()
  return logger
}

export { Logger }
