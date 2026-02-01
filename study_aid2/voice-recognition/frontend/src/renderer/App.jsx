import React, { useState, useCallback, useEffect } from 'react';
import AudioSourceSelector from '@components/AudioSourceSelector';
import TextDisplay from '@components/TextDisplay';
import ControlButtons from '@components/ControlButtons';
import StatusIndicator from '@components/StatusIndicator';
import VBCableNotice from '@components/VBCableNotice';
import useAudioRecorder from '@hooks/useAudioRecorder';
import useRecognition from '@hooks/useRecognition';
import useVBCable from '@hooks/useVBCable';
import { convertToPCM, generateFilename } from '@utils/audioUtils';
import { saveAsTxt } from '@utils/fileUtils';

function App() {
  const [audioSource, setAudioSource] = useState('microphone');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { isInstalled: isVBCableInstalled, requestAudioPermission } = useVBCable();
  const { isRecording, error: recordError, startRecording, stopRecording, onData } = useAudioRecorder(audioSource);
  const { status, recognizedText, error: recognitionError, startRecognition, stopRecognition, sendAudioData, clearText } = useRecognition('ws://localhost:8082');

  useEffect(() => {
    requestAudioPermission();
  }, [requestAudioPermission]);

  const handleAudioSourceChange = useCallback((source) => {
    if (isRecording) {
      alert('请先停止录音');
      return;
    }
    setAudioSource(source);
  }, [isRecording]);

  const handleStart = useCallback(async () => {
    try {
      setSaveError(null);
      clearText();
      await startRecording();
      startRecognition();
      onData((audioData) => {
        const pcmData = convertToPCM(audioData);
        sendAudioData(pcmData);
      });
    } catch (err) {
      console.error('启动录音失败:', err);
      setSaveError('启动录音失败: ' + err.message);
    }
  }, [startRecording, startRecognition, onData, sendAudioData, clearText]);

  const handleStop = useCallback(() => {
    stopRecording();
    stopRecognition();
  }, [stopRecording, stopRecognition]);

  const handleSave = useCallback(async () => {
    if (!recognizedText) {
      alert('没有可保存的文本');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      const filename = generateFilename();
      const result = await saveAsTxt(recognizedText, filename);
      
      if (result.success) {
        alert('文件保存成功: ' + result.filePath);
      } else {
        alert('文件保存失败');
      }
    } catch (err) {
      console.error('保存文件失败:', err);
      setSaveError('保存文件失败: ' + err.message);
      alert('保存文件失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [recognizedText]);

  const error = recordError || recognitionError || saveError;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎙️ 实时语音识别</h1>
        <StatusIndicator status={status} audioSource={audioSource} />
      </header>

      <main className="app-main">
        <div className="content-section">
          <h2>选择音频源</h2>
          <AudioSourceSelector
            selectedSource={audioSource}
            onSelect={handleAudioSourceChange}
          />
          {audioSource === 'system' && !isVBCableInstalled && (
            <VBCableNotice isVisible={true} />
          )}
        </div>

        <div className="content-section">
          <h2>识别结果</h2>
          <TextDisplay
            text={recognizedText}
            isRecording={isRecording}
            placeholder="识别结果将在这里实时显示..."
          />
        </div>

        <div className="content-section">
          <ControlButtons
            onStart={handleStart}
            onStop={handleStop}
            onSave={handleSave}
            isRecording={isRecording}
            hasText={!!recognizedText}
            isSaving={isSaving}
          />
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>基于 Electron + React + 科大讯飞 API</p>
      </footer>
    </div>
  );
}

export default App;
