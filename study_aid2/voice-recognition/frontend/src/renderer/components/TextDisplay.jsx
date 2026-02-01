import React from 'react';
import PropTypes from 'prop-types';

const TextDisplay = ({ text, isRecording, placeholder = '识别结果将在这里实时显示...' }) => {
  return (
    <div className={`text-display ${!text ? 'placeholder' : ''} ${isRecording ? 'recording' : ''}`}>
      {text || placeholder}
    </div>
  );
};

TextDisplay.propTypes = {
  text: PropTypes.string.isRequired,
  isRecording: PropTypes.bool.isRequired,
  placeholder: PropTypes.string
};

export default TextDisplay;
