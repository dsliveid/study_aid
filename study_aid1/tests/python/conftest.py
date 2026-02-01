"""
Pytest Configuration and Shared Fixtures for Desktop Learning Assistant Tests
桌面学习助手测试共享配置和Fixture
"""

import pytest
import asyncio
from datetime import datetime
from typing import Dict, Any, Generator
from unittest.mock import Mock, MagicMock
import json


# ============================================================================
# Session-scoped fixtures
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_config() -> Dict[str, Any]:
    """Global test configuration."""
    return {
        "test_mode": True,
        "mock_external_services": True,
        "test_data_path": "./test_data",
        "timeout": {
            "short": 5,
            "medium": 30,
            "long": 120
        }
    }


# ============================================================================
# Service Configuration Fixtures
# ============================================================================

@pytest.fixture
def speech_recognition_config() -> Dict[str, str]:
    """Valid speech recognition service configuration."""
    return {
        "apiKey": "test_api_key_123456789",
        "appId": "test_app_id_12345",
        "apiSecret": "test_api_secret_abcdef123456",
        "language": "zh_cn",
        "domain": "iat",
        "format": "audio/L16;rate=16000"
    }


@pytest.fixture
def speech_recognition_config_invalid() -> Dict[str, str]:
    """Invalid speech recognition service configuration (missing required fields)."""
    return {
        "apiKey": "",
        "appId": "",
        "apiSecret": ""
    }


@pytest.fixture
def ai_content_config() -> Dict[str, Any]:
    """Valid AI content service configuration."""
    return {
        "apiKey": "test_deepseek_api_key_12345",
        "baseUrl": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "maxTokens": 4096,
        "temperature": 0.7
    }


@pytest.fixture
def ai_content_config_invalid() -> Dict[str, Any]:
    """Invalid AI content service configuration (missing API key)."""
    return {
        "apiKey": "",
        "baseUrl": "https://api.deepseek.com/v1",
        "model": "deepseek-chat"
    }


@pytest.fixture
def image_recognition_config() -> Dict[str, Any]:
    """Valid image recognition service configuration."""
    return {
        "ocr": {
            "provider": "baidu",
            "baidu": {
                "apiKey": "test_baidu_api_key",
                "secretKey": "test_baidu_secret_key"
            }
        },
        "vision": {
            "provider": "qwen",
            "qwen": {
                "apiKey": "test_qwen_api_key",
                "model": "qwen-vl-plus"
            }
        }
    }


@pytest.fixture
def image_recognition_config_partial() -> Dict[str, Any]:
    """Partial image recognition configuration (OCR only)."""
    return {
        "ocr": {
            "provider": "baidu",
            "baidu": {
                "apiKey": "test_baidu_api_key",
                "secretKey": "test_baidu_secret_key"
            }
        }
    }


@pytest.fixture
def image_recognition_config_invalid() -> Dict[str, Any]:
    """Invalid image recognition service configuration."""
    return {
        "ocr": {
            "provider": "baidu",
            "baidu": {
                "apiKey": "",
                "secretKey": ""
            }
        }
    }


@pytest.fixture
def updater_config() -> Dict[str, Any]:
    """Valid updater service configuration."""
    return {
        "provider": "github",
        "owner": "test-user",
        "repo": "study-aid",
        "autoDownload": True,
        "autoInstallOnAppQuit": True
    }


# ============================================================================
# Mock Data Fixtures
# ============================================================================

@pytest.fixture
def mock_screenshot_data() -> Dict[str, Any]:
    """Mock screenshot data for testing."""
    return {
        "id": "screenshot_1234567890_abc123",
        "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "timestamp": 1234567890,
        "path": "/tmp/screenshots/test.png"
    }


@pytest.fixture
def mock_recognition_result() -> Dict[str, Any]:
    """Mock speech recognition result."""
    return {
        "text": "这是一段测试语音识别文本",
        "isFinal": True,
        "confidence": 0.95,
        "startTime": 0,
        "endTime": 5000
    }


@pytest.fixture
def mock_ocr_result() -> Dict[str, Any]:
    """Mock OCR recognition result."""
    return {
        "success": True,
        "text": "这是图片中的文字内容",
        "confidence": 0.92,
        "wordsResult": [
            {"words": "这是", "confidence": 0.95},
            {"words": "图片中的", "confidence": 0.90},
            {"words": "文字内容", "confidence": 0.91}
        ]
    }


@pytest.fixture
def mock_image_understanding_result() -> Dict[str, Any]:
    """Mock image understanding result."""
    return {
        "success": True,
        "description": "这是一张包含文字内容的图片",
        "keyPoints": ["主要元素1", "主要元素2", "主要元素3"]
    }


@pytest.fixture
def mock_knowledge_tree_result() -> Dict[str, Any]:
    """Mock knowledge tree generation result."""
    return {
        "title": "测试文档",
        "structure": [
            {
                "title": "第一章",
                "level": 1,
                "importance": "high",
                "children": [
                    {
                        "title": "1.1 节",
                        "level": 2,
                        "importance": "medium",
                        "children": []
                    }
                ]
            }
        ]
    }


@pytest.fixture
def mock_key_points_result() -> Dict[str, Any]:
    """Mock key points extraction result."""
    return {
        "keyPoints": [
            {
                "content": "这是第一个要点",
                "importance": "high",
                "location": "第一章"
            },
            {
                "content": "这是第二个要点",
                "importance": "medium",
                "location": "第二章"
            }
        ]
    }


@pytest.fixture
def mock_difficult_points_result() -> Dict[str, Any]:
    """Mock difficult points annotation result."""
    return {
        "difficultPoints": [
            {
                "content": "复杂概念A",
                "explanation": "这是复杂概念A的详细解释",
                "difficulty": "high",
                "location": "第三章"
            }
        ]
    }


@pytest.fixture
def mock_update_info() -> Dict[str, Any]:
    """Mock update information."""
    return {
        "version": "1.1.0",
        "releaseDate": datetime.now().isoformat(),
        "files": [
            {
                "url": "https://github.com/test/study-aid/releases/download/v1.1.0/app.exe",
                "sha512": "abc123...",
                "size": 50000000
            }
        ]
    }


# ============================================================================
# Mock Service Fixtures
# ============================================================================

@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection."""
    ws = Mock()
    ws.readyState = 1  # WebSocket.OPEN
    ws.send = Mock()
    ws.close = Mock()
    return ws


@pytest.fixture
def mock_axios_instance():
    """Mock Axios HTTP client instance."""
    mock = Mock()
    mock.post = Mock()
    mock.get = Mock()
    mock.defaults = {
        "baseURL": "https://api.test.com",
        "headers": {}
    }
    return mock


@pytest.fixture
def mock_browser_window():
    """Mock Electron BrowserWindow."""
    window = Mock()
    window.webContents = Mock()
    window.webContents.send = Mock()
    window.isDestroyed = Mock(return_value=False)
    window.show = Mock()
    window.focus = Mock()
    window.close = Mock()
    return window


@pytest.fixture
def mock_desktop_capturer():
    """Mock Electron desktopCapturer."""
    capturer = Mock()
    source = Mock()
    source.id = "screen:0:0"
    source.name = "Screen 1"
    source.thumbnail = Mock()
    source.thumbnail.toDataURL = Mock(return_value="data:image/png;base64,test")
    capturer.getSources = Mock(return_value=asyncio.Future())
    capturer.getSources.return_value.set_result([source])
    return capturer


@pytest.fixture
def mock_auto_updater():
    """Mock Electron autoUpdater."""
    updater = Mock()
    updater.checkForUpdates = Mock(return_value=asyncio.Future())
    updater.checkForUpdates.return_value.set_result(None)
    updater.downloadUpdate = Mock(return_value=asyncio.Future())
    updater.downloadUpdate.return_value.set_result(None)
    updater.quitAndInstall = Mock()
    updater.on = Mock()
    return updater


# ============================================================================
# Test Utility Fixtures
# ============================================================================

@pytest.fixture
def sample_document_content() -> str:
    """Sample document content for testing AI content generation."""
    return """
    # 测试文档标题

    ## 第一章 引言
    这是第一章的内容，介绍了项目的背景和目的。

    ## 第二章 核心概念
    本章介绍了核心概念A和概念B。
    概念A是一个重要的基础概念。
    概念B建立在概念A之上，更加复杂。

    ## 第三章 实现细节
    本章详细描述了实现过程。
    包括步骤1、步骤2和步骤3。

    ## 第四章 总结
    总结全文，展望未来。
    """


@pytest.fixture
def sample_audio_buffer() -> bytes:
    """Sample audio buffer for testing speech recognition."""
    # Simulate 1 second of 16kHz 16-bit mono audio (32000 bytes)
    return b'\x00\x01' * 16000


@pytest.fixture
def sample_image_buffer() -> bytes:
    """Sample image buffer for testing image recognition."""
    # Minimal valid PNG header
    return b'\x89PNG\r\n\x1a\n' + b'\x00' * 100


@pytest.fixture
def test_timeout() -> Dict[str, int]:
    """Test timeout values in seconds."""
    return {
        "unit": 5,
        "integration": 30,
        "e2e": 120
    }


# ============================================================================
# Pytest Hooks and Configuration
# ============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "speech: Speech recognition tests")
    config.addinivalue_line("markers", "screenshot: Screenshot tests")
    config.addinivalue_line("markers", "image: Image recognition tests")
    config.addinivalue_line("markers", "ai: AI content generation tests")
    config.addinivalue_line("markers", "updater: Auto updater tests")


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on test name."""
    for item in items:
        # Auto-mark tests based on their name
        if "speech" in item.nodeid.lower():
            item.add_marker(pytest.mark.speech)
        if "screenshot" in item.nodeid.lower():
            item.add_marker(pytest.mark.screenshot)
        if "image" in item.nodeid.lower():
            item.add_marker(pytest.mark.image)
        if "ai_content" in item.nodeid.lower() or "ai" in item.nodeid.lower():
            item.add_marker(pytest.mark.ai)
        if "updater" in item.nodeid.lower():
            item.add_marker(pytest.mark.updater)


# ============================================================================
# Helper Functions
# ============================================================================

def create_mock_response(status_code: int = 200, json_data: Dict = None, text: str = None):
    """Helper to create mock HTTP responses."""
    response = Mock()
    response.status_code = status_code
    if json_data:
        response.json = Mock(return_value=json_data)
    if text:
        response.text = text
    return response


def create_mock_websocket_message(message_type: str, data: Dict[str, Any]) -> str:
    """Helper to create mock WebSocket messages."""
    message = {
        "type": message_type,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }
    return json.dumps(message)
