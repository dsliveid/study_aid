import React from 'react';
import PropTypes from 'prop-types';

const VBCableNotice = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="vb-cable-notice">
      <div className="notice-title">
        <span>⚠️</span>
        <span>VB-Cable 未检测到</span>
      </div>
      <div className="notice-content">
        <p>
          使用系统音频需要先安装VB-Cable虚拟音频设备。<br />
          <a href="VB-Cable_Setup_Guide.md" target="_blank" rel="noopener noreferrer">
            查看安装指南 →
          </a>
        </p>
      </div>
    </div>
  );
};

VBCableNotice.propTypes = {
  isVisible: PropTypes.bool.isRequired
};

export default VBCableNotice;