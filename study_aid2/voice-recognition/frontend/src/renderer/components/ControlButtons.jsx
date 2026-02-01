import React from 'react';
import PropTypes from 'prop-types';

const ControlButtons = ({ onStart, onStop, onSave, isRecording, hasText, isSaving }) => {
  return (
    <div className="control-buttons">
      <button
        className={`control-btn ${isRecording || isSaving ? 'disabled' : ''}`}
        onClick={onStart}
        disabled={isRecording || isSaving}
      >
        <span>🎙️</span>
        <span>开始录音</span>
      </button>
      <button
        className={`control-btn ${!isRecording || isSaving ? 'disabled' : ''}`}
        onClick={onStop}
        disabled={!isRecording || isSaving}
      >
        <span>⏹️</span>
        <span>停止录音</span>
      </button>
      <button
        className={`control-btn ${!hasText || isRecording || isSaving ? 'disabled' : ''}`}
        onClick={onSave}
        disabled={!hasText || isRecording || isSaving}
      >
        <span>💾</span>
        <span>{isSaving ? '保存中...' : '保存为TXT'}</span>
      </button>
    </div>
  );
};

ControlButtons.propTypes = {
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isRecording: PropTypes.bool.isRequired,
  hasText: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired
};

export default ControlButtons;
