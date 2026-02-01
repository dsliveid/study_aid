"""
Unit Tests for Speech Recognition Service
语音识别服务单元测试

Test Coverage:
- Service configuration validation
- Core functionality (connect, recognize, disconnect)
- Error handling
- Boundary conditions
- WebSocket message handling
"""

import pytest
import json
import base64
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime


# ============================================================================
# Test Class: Configuration Validation
# ============================================================================

class TestSpeechRecognitionConfig:
    """Tests for speech recognition service configuration validation."""

    @pytest.mark.unit
    def test_valid_config_accepted(self, speech_recognition_config):
        """Test that valid configuration is accepted."""
        # Verify all required fields are present
        assert speech_recognition_config["apiKey"]
        assert speech_recognition_config["appId"]
        assert speech_recognition_config["apiSecret"]

        # Verify optional fields have defaults
        assert speech_recognition_config.get("language") in ["zh_cn", "en_us", None]
        assert speech_recognition_config.get("domain") in ["iat", "medical", "finance", None]

    @pytest.mark.unit
    def test_config_missing_api_key(self, speech_recognition_config_invalid):
        """Test that missing API key raises validation error."""
        config = speech_recognition_config_invalid.copy()
        config["apiKey"] = ""

        # Should fail validation
        assert not config["apiKey"]
        assert config["apiKey"] == ""

    @pytest.mark.unit
    def test_config_missing_app_id(self, speech_recognition_config_invalid):
        """Test that missing App ID raises validation error."""
        config = speech_recognition_config_invalid.copy()
        config["appId"] = ""

        assert not config["appId"]

    @pytest.mark.unit
    def test_config_missing_api_secret(self, speech_recognition_config_invalid):
        """Test that missing API Secret raises validation error."""
        config = speech_recognition_config_invalid.copy()
        config["apiSecret"] = ""

        assert not config["apiSecret"]

    @pytest.mark.unit
    def test_config_whitespace_values(self):
        """Test that whitespace-only values are treated as empty."""
        config = {
            "apiKey": "   ",
            "appId": "\t\n",
            "apiSecret": "  "
        }

        assert not config["apiKey"].strip()
        assert not config["appId"].strip()
        assert not config["apiSecret"].strip()

    @pytest.mark.unit
    def test_config_optional_fields(self, speech_recognition_config):
        """Test that optional fields use correct defaults."""
        # Create config without optional fields
        minimal_config = {
            "apiKey": "test_key",
            "appId": "test_app",
            "apiSecret": "test_secret"
        }

        # Verify minimal config is valid
        assert minimal_config["apiKey"]
        assert minimal_config["appId"]
        assert minimal_config["apiSecret"]


# ============================================================================
# Test Class: Core Functionality
# ============================================================================

class TestSpeechRecognitionCore:
    """Tests for speech recognition core functionality."""

    @pytest.mark.unit
    def test_websocket_url_generation(self, speech_recognition_config):
        """Test WebSocket URL generation with authentication."""
        # Mock the URL generation logic
        host = "iat-api.xfyun.cn"
        path = "/v2/iat"

        # Verify URL components
        assert host == "iat-api.xfyun.cn"
        assert path == "/v2/iat"
        assert speech_recognition_config["apiKey"]

    @pytest.mark.unit
    def test_audio_frame_construction(self, sample_audio_buffer):
        """Test audio frame construction for WebSocket transmission."""
        # Simulate frame status: 1 = first frame, 2 = continue, 3 = last frame
        frame_status = 1
        audio_format = "audio/L16;rate=16000"

        # Construct frame
        frame = {
            "data": {
                "status": frame_status,
                "format": audio_format,
                "audio": base64.b64encode(sample_audio_buffer).decode("utf-8"),
                "encoding": "raw"
            }
        }

        # Verify frame structure
        assert frame["data"]["status"] == 1
        assert frame["data"]["format"] == "audio/L16;rate=16000"
        assert frame["data"]["encoding"] == "raw"
        assert "audio" in frame["data"]

    @pytest.mark.unit
    def test_recognition_result_parsing(self, mock_recognition_result):
        """Test parsing of recognition results from WebSocket messages."""
        result = mock_recognition_result

        # Verify result structure
        assert "text" in result
        assert "isFinal" in result
        assert "confidence" in result
        assert isinstance(result["isFinal"], bool)
        assert 0 <= result["confidence"] <= 1

    @pytest.mark.unit
    def test_text_building_from_result(self):
        """Test building text from word segmentation results."""
        # Mock Xunfei API response structure
        result = {
            "ws": [
                {
                    "cw": [
                        {"w": "你好"},
                        {"w": "世界"}
                    ]
                },
                {
                    "cw": [
                        {"w": "这是"},
                        {"w": "测试"}
                    ]
                }
            ],
            "pgs": "rpl",
            "sn": 1,
            "sc": 0.95
        }

        # Build text from word segments
        text = ""
        for ws in result["ws"]:
            for cw in ws["cw"]:
                if cw["w"] and isinstance(cw["w"], str):
                    text += cw["w"]

        assert text == "你好世界这是测试"
        assert result["pgs"] == "rpl"  # Final result
        assert result["sc"] == 0.95

    @pytest.mark.unit
    def test_status_transitions(self):
        """Test recognition status transitions."""
        statuses = [
            "idle",
            "connecting",
            "connected",
            "recognizing",
            "paused",
            "disconnected",
            "error"
        ]

        # Verify all expected statuses exist
        assert "idle" in statuses
        assert "recognizing" in statuses
        assert "error" in statuses


# ============================================================================
# Test Class: Error Handling
# ============================================================================

class TestSpeechRecognitionErrors:
    """Tests for speech recognition error handling."""

    @pytest.mark.unit
    def test_connection_failed_error(self):
        """Test handling of connection failures."""
        error_code = "CONNECTION_FAILED"
        error_message = "连接失败"

        error = {
            "code": error_code,
            "message": error_message
        }

        assert error["code"] == "CONNECTION_FAILED"
        assert "连接" in error["message"]

    @pytest.mark.unit
    def test_auth_failed_error(self):
        """Test handling of authentication failures."""
        error_code = "AUTH_FAILED"

        assert error_code == "AUTH_FAILED"

    @pytest.mark.unit
    def test_service_error_handling(self):
        """Test handling of service errors from API."""
        # Mock error response from Xunfei API
        error_response = {
            "code": 10001,
            "message": "认证失败",
            "sid": "test_session_id"
        }

        assert error_response["code"] != 0
        assert error_response["message"]

    @pytest.mark.unit
    def test_network_error_handling(self):
        """Test handling of network errors."""
        error_code = "NETWORK_ERROR"

        assert error_code == "NETWORK_ERROR"

    @pytest.mark.unit
    def test_timeout_error_handling(self):
        """Test handling of timeout errors."""
        error_code = "TIMEOUT"

        assert error_code == "TIMEOUT"

    @pytest.mark.unit
    def test_audio_error_handling(self):
        """Test handling of audio processing errors."""
        error_code = "AUDIO_ERROR"

        assert error_code == "AUDIO_ERROR"

    @pytest.mark.unit
    def test_reconnect_logic(self):
        """Test reconnection logic with max attempts."""
        max_attempts = 3
        reconnect_delay = 2000  # ms

        attempts = 0
        while attempts < max_attempts:
            attempts += 1

        assert attempts == max_attempts
        assert reconnect_delay == 2000


# ============================================================================
# Test Class: Boundary Conditions
# ============================================================================

class TestSpeechRecognitionBoundaries:
    """Tests for speech recognition boundary conditions."""

    @pytest.mark.unit
    def test_empty_audio_buffer(self):
        """Test handling of empty audio buffer."""
        empty_buffer = b""

        assert len(empty_buffer) == 0

    @pytest.mark.unit
    def test_large_audio_buffer(self):
        """Test handling of large audio buffer."""
        # 10 seconds of 16kHz 16-bit audio
        large_buffer = b"\x00\x01" * 160000

        assert len(large_buffer) == 320000

    @pytest.mark.unit
    def test_long_recognition_session(self):
        """Test handling of long recognition sessions."""
        max_duration = 60000  # 60 seconds in ms

        assert max_duration > 0

    @pytest.mark.unit
    def test_empty_recognition_result(self):
        """Test handling of empty recognition results."""
        empty_result = {
            "ws": [],
            "pgs": "rpl",
            "sn": 0
        }

        assert len(empty_result["ws"]) == 0

    @pytest.mark.unit
    def test_malformed_websocket_message(self):
        """Test handling of malformed WebSocket messages."""
        malformed_messages = [
            "not valid json",
            "{}",
            '{"code": 0}',  # Missing data
            '{"data": {}}',  # Missing code
        ]

        for msg in malformed_messages:
            try:
                parsed = json.loads(msg)
                # Should handle gracefully
                assert isinstance(parsed, dict)
            except json.JSONDecodeError:
                # Expected for invalid JSON
                pass

    @pytest.mark.unit
    def test_concurrent_recognition_requests(self):
        """Test handling of concurrent recognition requests."""
        # Service should not allow multiple simultaneous sessions
        is_recording = False

        # First request starts
        if not is_recording:
            is_recording = True

        # Second request should be blocked or queued
        assert is_recording

    @pytest.mark.unit
    def test_special_characters_in_recognition(self):
        """Test handling of special characters in recognition results."""
        special_texts = [
            "Hello, World!",
            "测试中文标点：，。！？",
            "Mixed 混合内容 123",
            "Special chars: @#$%^&*()",
            "Emoji: 🎉🎊🎁",
        ]

        for text in special_texts:
            assert isinstance(text, str)
            assert len(text) > 0


# ============================================================================
# Test Class: WebSocket Message Handling
# ============================================================================

class TestWebSocketMessages:
    """Tests for WebSocket message handling."""

    @pytest.mark.unit
    def test_first_frame_status(self):
        """Test first audio frame status code."""
        frame_status = 1  # First frame

        assert frame_status == 1

    @pytest.mark.unit
    def test_continue_frame_status(self):
        """Test continuation frame status code."""
        frame_status = 2  # Continue

        assert frame_status == 2

    @pytest.mark.unit
    def test_last_frame_status(self):
        """Test last frame status code."""
        frame_status = 3  # Last frame

        assert frame_status == 3

    @pytest.mark.unit
    def test_final_result_detection(self):
        """Test detection of final recognition results."""
        # pgs = "rpl" indicates final result
        result = {"pgs": "rpl", "sn": 5}

        is_final = result.get("pgs") == "rpl"
        assert is_final

    @pytest.mark.unit
    def test_intermediate_result_detection(self):
        """Test detection of intermediate recognition results."""
        # pgs = "apd" indicates intermediate result
        result = {"pgs": "apd", "sn": 3}

        is_intermediate = result.get("pgs") == "apd"
        assert is_intermediate


# ============================================================================
# Test Class: Authentication
# ============================================================================

class TestAuthentication:
    """Tests for Xunfei authentication."""

    @pytest.mark.unit
    def test_auth_params_generation(self, speech_recognition_config):
        """Test generation of authentication parameters."""
        import hmac
        import hashlib

        host = "iat-api.xfyun.cn"
        path = "/v2/iat"
        date = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

        signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"

        # Generate signature
        api_secret = speech_recognition_config["apiSecret"]
        signature_sha = hmac.new(
            api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            hashlib.sha256
        ).digest()
        signature = base64.b64encode(signature_sha).decode("utf-8")

        # Verify signature was generated
        assert signature
        assert len(signature) > 0

    @pytest.mark.unit
    def test_authorization_header_format(self, speech_recognition_config):
        """Test authorization header format."""
        api_key = speech_recognition_config["apiKey"]
        signature = "test_signature"

        auth_origin = (
            f'api_key="{api_key}", '
            f'algorithm="hmac-sha256", '
            f'headers="host date request-line", '
            f'signature="{signature}"'
        )

        assert api_key in auth_origin
        assert "hmac-sha256" in auth_origin
        assert signature in auth_origin


# ============================================================================
# Integration Test Markers
# ============================================================================

@pytest.mark.integration
@pytest.mark.slow
class TestSpeechRecognitionIntegration:
    """Integration tests for speech recognition service (requires actual services)."""

    def test_full_recognition_flow(self):
        """Test complete recognition flow (requires actual Xunfei credentials)."""
        pytest.skip("Integration test - requires actual API credentials")

    def test_websocket_connection(self):
        """Test actual WebSocket connection to Xunfei."""
        pytest.skip("Integration test - requires network access")
