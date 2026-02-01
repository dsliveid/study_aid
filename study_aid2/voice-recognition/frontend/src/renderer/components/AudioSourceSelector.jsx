import React from 'react';
import PropTypes from 'prop-types';

const AudioSourceSelector = ({ selectedSource, onSelect }) => {
  const sources = [
    {
      id: 'microphone',
      icon: '🎤',
      title: '麦克风',
      description: '直接采集麦克风音频'
    },
    {
      id: 'system',
      icon: '🖥️',
      title: '系统音频',
      description: '捕获本地视频音频（需VB-Cable）'
    }
  ];

  return (
    <div className="audio-source-selector">
      {sources.map((source) => (
        <div
          key={source.id}
          className={`audio-source-option ${selectedSource === source.id ? 'active' : ''}`}
          onClick={() => onSelect(source.id)}
        >
          <div className="icon">{source.icon}</div>
          <div className="info">
            <h3>{source.title}</h3>
            <p>{source.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

AudioSourceSelector.propTypes = {
  selectedSource: PropTypes.oneOf(['microphone', 'system']).isRequired,
  onSelect: PropTypes.func.isRequired
};

export default AudioSourceSelector;
