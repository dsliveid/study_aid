class RecognitionService {
  constructor() {
    this.recognitionCache = new Map();
    this.currentSessionId = null;
    this.sessionResults = [];
  }

  startSession() {
    this.currentSessionId = this.generateSessionId();
    this.sessionResults = [];
    return this.currentSessionId;
  }

  endSession() {
    const sessionId = this.currentSessionId;
    const results = [...this.sessionResults];
    
    this.recognitionCache.set(sessionId, {
      sessionId,
      results,
      startTime: Date.now() - (results.length * 2000),
      endTime: Date.now()
    });

    this.currentSessionId = null;
    this.sessionResults = [];

    return {
      sessionId,
      results,
      fullText: results.map(r => r.text).join('')
    };
  }

  addResult(result) {
    if (this.currentSessionId) {
      this.sessionResults.push(result);
    }
    return result;
  }

  getSessionResults(sessionId) {
    return this.recognitionCache.get(sessionId);
  }

  clearCache() {
    this.recognitionCache.clear();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateAccuracy(results) {
    if (!results || results.length === 0) return 0;

    const totalConfidence = results.reduce((sum, result) => {
      return sum + (result.confidence || 0);
    }, 0);

    return (totalConfidence / results.length) * 100;
  }

  calculateLatency(results) {
    if (!results || results.length === 0) return 0;

    const latencies = results.map(result => {
      return result.latency || 0;
    });

    const avgLatency = latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
    return Math.round(avgLatency);
  }
}

module.exports = RecognitionService;
