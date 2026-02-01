import React from 'react';
import PropTypes from 'prop-types';

const StatusIndicator = ({ status, audioSource }) => {
  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '已停止';
      case 'connecting':
        return '连接中...';
      case 'recording':
        return `录音中... (${audioSource === 'microphone' ? '麦克风' : '系统音频'})`;
      case 'error':
        return '错误';
      default:
        return '未知状态';
    }
  };

  return (
    <div className="status-indicator">
      <div className={`status-dot ${status}`}></div>
      <span>{getStatusText()}</span>
    </div>
  );
};

StatusIndicator.propTypes = {
  status: PropTypes.oneOf(['idle', 'connecting', 'recording', 'error']).isRequired,
  audioSource: PropTypes.oneOf(['microphone', 'system']).isRequired
};

export default StatusIndicator;