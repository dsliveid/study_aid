import { useState, useCallback, useRef } from 'react';

const useAudioRecorder = (audioSource = 'microphone') => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      let stream;
      if (audioSource === 'microphone') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1
          }
        });
      } else if (audioSource === 'system') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        const vbCableDevice = audioInputs.find(device => 
          device.label.toLowerCase().includes('vb-cable') ||
          device.label.toLowerCase().includes('vb audio') ||
          device.label.toLowerCase().includes('cable input')
        );

        if (!vbCableDevice) {
          throw new Error('未找到VB-Cable设备，请先安装VB-Cable虚拟音频设备');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: vbCableDevice.deviceId },
            sampleRate: 16000,
            channelCount: 1
          }
        });
      }

      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        if (mediaRecorderRef.current && mediaRecorderRef.current.onData) {
          mediaRecorderRef.current.onData(audioData);
        }
      };

      mediaRecorderRef.current = {
        processor,
        onData: null
      };

      setIsRecording(true);
    } catch (err) {
      setError(err.message);
      console.error('Error starting recording:', err);
    }
  }, [audioSource]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.processor) {
      mediaRecorderRef.current.processor.disconnect();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
  }, []);

  const onData = useCallback((callback) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onData = callback;
    }
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    onData
  };
};

export default useAudioRecorder;
