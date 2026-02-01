import { useState, useCallback, useEffect, useRef } from 'react';

const useRecognition = (wsUrl = 'ws://localhost:8080') => {
  const [status, setStatus] = useState('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    setStatus('connecting');
    setError(null);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket连接成功');
        setStatus('idle');
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        const result = JSON.parse(event.data);
        
        if (result.text) {
          setRecognizedText(prev => {
            if (result.isFinal) {
              return prev + result.text;
            }
            return prev;
          });
        }

        if (result.error) {
          setError(result.error);
          setStatus('error');
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket错误:', event);
        setError('WebSocket连接错误');
        setStatus('error');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket连接关闭');
        if (status === 'recording') {
          handleReconnect();
        } else {
          setStatus('idle');
        }
      };
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [wsUrl, status]);

  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      console.log(`尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      setTimeout(() => {
        connect();
      }, 1000 * reconnectAttemptsRef.current);
    } else {
      setError('重连失败，请检查网络连接');
      setStatus('error');
    }
  }, [connect]);

  const sendAudioData = useCallback((audioData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'audio',
        data: Array.from(audioData),
        sampleRate: 16000,
        channels: 1,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setStatus('recording');
    } else {
      connect();
    }
  }, [connect]);

  const stopRecognition = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'stop'
      };
      wsRef.current.send(JSON.stringify(message));
    }
    setStatus('idle');
  }, []);

  const clearText = useCallback(() => {
    setRecognizedText('');
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    recognizedText,
    error,
    startRecognition,
    stopRecognition,
    sendAudioData,
    clearText
  };
};

export default useRecognition;