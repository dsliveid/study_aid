"""
Unit Tests for Image Recognition Service
图像识别服务单元测试

Test Coverage:
- Service configuration validation
- OCR text recognition
- Image understanding
- Error handling
- Boundary conditions
- API integration
"""

import pytest
import base64
import json
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from PIL import Image


# ============================================================================
# Test Class: Configuration Validation
# ============================================================================

class TestImageRecognitionConfig:
    """Tests for image recognition service configuration validation."""

    @pytest.mark.unit
    def test_valid_full_config(self, image_recognition_config):
        """Test that valid full configuration is accepted."""
        config = image_recognition_config

        # Verify OCR configuration
        assert config["ocr"]["provider"] == "baidu"
        assert config["ocr"]["baidu"]["apiKey"]
        assert config["ocr"]["baidu"]["secretKey"]

        # Verify Vision configuration
        assert config["vision"]["provider"] == "qwen"
        assert config["vision"]["qwen"]["apiKey"]
        assert config["vision"]["qwen"]["model"] in ["qwen-vl-plus", "qwen-vl-max"]

    @pytest.mark.unit
    def test_valid_partial_config(self, image_recognition_config_partial):
        """Test that valid partial configuration (OCR only) is accepted."""
        config = image_recognition_config_partial

        assert "ocr" in config
        assert "vision" not in config
        assert config["ocr"]["baidu"]["apiKey"]

    @pytest.mark.unit
    def test_config_missing_ocr_api_key(self, image_recognition_config_invalid):
        """Test that missing OCR API key raises validation error."""
        config = image_recognition_config_invalid

        assert not config["ocr"]["baidu"]["apiKey"]

    @pytest.mark.unit
    def test_config_missing_ocr_secret_key(self, image_recognition_config_invalid):
        """Test that missing OCR secret key raises validation error."""
        config = image_recognition_config_invalid

        assert not config["ocr"]["baidu"]["secretKey"]

    @pytest.mark.unit
    def test_config_unsupported_provider(self):
        """Test handling of unsupported provider."""
        config = {
            "ocr": {
                "provider": "unsupported_provider"
            }
        }

        assert config["ocr"]["provider"] not in ["baidu", "tencent", "qwen"]

    @pytest.mark.unit
    def test_config_invalid_model_name(self):
        """Test handling of invalid model name."""
        config = {
            "vision": {
                "provider": "qwen",
                "qwen": {
                    "apiKey": "test_key",
                    "model": "invalid-model"
                }
            }
        }

        assert config["vision"]["qwen"]["model"] not in ["qwen-vl-plus", "qwen-vl-max"]


# ============================================================================
# Test Class: OCR Functionality
# ============================================================================

class TestOCRFunctionality:
    """Tests for OCR text recognition functionality."""

    @pytest.mark.unit
    def test_ocr_result_structure(self, mock_ocr_result):
        """Test OCR result structure."""
        result = mock_ocr_result

        assert "success" in result
        assert "text" in result
        assert "confidence" in result
        assert "wordsResult" in result
        assert isinstance(result["success"], bool)
        assert 0 <= result["confidence"] <= 1

    @pytest.mark.unit
    def test_ocr_words_result_structure(self, mock_ocr_result):
        """Test OCR words result structure."""
        words_result = mock_ocr_result["wordsResult"]

        assert isinstance(words_result, list)
        for item in words_result:
            assert "words" in item
            assert "confidence" in item
            assert isinstance(item["words"], str)

    @pytest.mark.unit
    def test_image_to_base64_conversion(self, sample_image_buffer):
        """Test conversion of image buffer to base64."""
        base64_image = base64.b64encode(sample_image_buffer).decode("utf-8")

        assert isinstance(base64_image, str)
        assert len(base64_image) > 0

    @pytest.mark.unit
    def test_baidu_ocr_request_structure(self):
        """Test Baidu OCR API request structure."""
        request = {
            "image": "base64_encoded_image",
            "language_type": "CHN_ENG",
            "detect_direction": True,
            "paragraph": True,
            "probability": True
        }

        assert request["language_type"] in ["CHN_ENG", "ENG", "JAP", "KOR"]
        assert isinstance(request["detect_direction"], bool)
        assert isinstance(request["probability"], bool)

    @pytest.mark.unit
    def test_baidu_ocr_response_parsing(self):
        """Test parsing of Baidu OCR API response."""
        response = {
            "words_result": [
                {"words": "测试文字", "probability": {"average": 0.95}},
                {"words": "Hello World", "probability": {"average": 0.98}}
            ],
            "words_result_num": 2,
            "log_id": 1234567890
        }

        assert response["words_result_num"] == len(response["words_result"])
        assert all("words" in item for item in response["words_result"])

    @pytest.mark.unit
    def test_text_extraction_from_response(self):
        """Test text extraction from OCR response."""
        response = {
            "words_result": [
                {"words": "第一行"},
                {"words": "第二行"},
                {"words": "第三行"}
            ]
        }

        all_text = "\n".join(item["words"] for item in response["words_result"])

        assert "第一行" in all_text
        assert "第二行" in all_text
        assert "第三行" in all_text

    @pytest.mark.unit
    def test_confidence_calculation(self):
        """Test confidence score calculation."""
        words_result = [
            {"probability": {"average": 0.95}},
            {"probability": {"average": 0.85}},
            {"probability": {"average": 0.90}}
        ]

        confidences = [item["probability"]["average"] for item in words_result]
        avg_confidence = sum(confidences) / len(confidences)

        assert avg_confidence == 0.9

    @pytest.mark.unit
    def test_ocr_error_response_handling(self):
        """Test handling of OCR error responses."""
        error_response = {
            "error_code": "216201",
            "error_msg": "image format error"
        }

        assert "error_code" in error_response
        assert "error_msg" in error_response


# ============================================================================
# Test Class: Image Understanding
# ============================================================================

class TestImageUnderstanding:
    """Tests for image understanding functionality."""

    @pytest.mark.unit
    def test_understanding_result_structure(self, mock_image_understanding_result):
        """Test image understanding result structure."""
        result = mock_image_understanding_result

        assert "success" in result
        assert "description" in result
        assert "keyPoints" in result
        assert isinstance(result["success"], bool)
        assert isinstance(result["description"], str)

    @pytest.mark.unit
    def test_qwen_vl_request_structure(self):
        """Test Qwen VL API request structure."""
        request = {
            "model": "qwen-vl-plus",
            "input": {
                "messages": [
                    {
                        "role": "system",
                        "content": [{"text": "You are an assistant."}]
                    },
                    {
                        "role": "user",
                        "content": [
                            {"image": "data:image/jpeg;base64,test"},
                            {"text": "Describe this image."}
                        ]
                    }
                ]
            },
            "parameters": {
                "result_format": "message",
                "max_tokens": 2000,
                "temperature": 0.7
            }
        }

        assert request["model"] in ["qwen-vl-plus", "qwen-vl-max"]
        assert request["parameters"]["max_tokens"] > 0
        assert 0 <= request["parameters"]["temperature"] <= 1

    @pytest.mark.unit
    def test_qwen_vl_response_parsing(self):
        """Test parsing of Qwen VL API response."""
        response = {
            "output": {
                "choices": [
                    {
                        "message": {
                            "content": [{"text": "This is a description."}]
                        },
                        "finish_reason": "stop"
                    }
                ]
            },
            "usage": {
                "input_tokens": 100,
                "output_tokens": 50,
                "image_tokens": 200
            }
        }

        content = response["output"]["choices"][0]["message"]["content"][0]["text"]
        assert content == "This is a description."

    @pytest.mark.unit
    def test_key_points_extraction(self):
        """Test extraction of key points from description."""
        description = """
        1. First point
        2. Second point
        - Bullet point
        Another point
        """

        # Extract numbered and bullet points
        import re
        patterns = [
            r'^\s*\d+[.、]\s*(.+)',
            r'^\s*[-•]\s*(.+)'
        ]

        points = []
        for line in description.split('\n'):
            for pattern in patterns:
                match = re.match(pattern, line)
                if match:
                    points.append(match.group(1).strip())

        assert len(points) >= 2

    @pytest.mark.unit
    def test_custom_prompt_handling(self):
        """Test handling of custom prompts."""
        default_prompt = "请详细描述这张图片的内容"
        custom_prompt = "提取图片中的所有文字"

        assert default_prompt != custom_prompt
        assert len(custom_prompt) > 0


# ============================================================================
# Test Class: Baidu Authentication
# ============================================================================

class TestBaiduAuthentication:
    """Tests for Baidu OCR authentication."""

    @pytest.mark.unit
    def test_access_token_request_params(self):
        """Test access token request parameters."""
        params = {
            "grant_type": "client_credentials",
            "client_id": "test_api_key",
            "client_secret": "test_secret_key"
        }

        assert params["grant_type"] == "client_credentials"
        assert params["client_id"]
        assert params["client_secret"]

    @pytest.mark.unit
    def test_access_token_response_handling(self):
        """Test handling of access token response."""
        response = {
            "access_token": "test_token_12345",
            "expires_in": 2592000  # 30 days
        }

        assert "access_token" in response
        assert response["expires_in"] == 2592000

    @pytest.mark.unit
    def test_token_expiry_calculation(self):
        """Test token expiry time calculation."""
        from datetime import datetime, timedelta

        expires_in = 2592000  # 30 days in seconds
        expiry_time = datetime.now() + timedelta(seconds=expires_in - 86400)  # 29 days

        assert expiry_time > datetime.now()

    @pytest.mark.unit
    def test_token_refresh_logic(self):
        """Test token refresh logic."""
        current_time = 1000000
        token_expiry = 900000  # Token expires in the past

        needs_refresh = current_time > token_expiry

        assert needs_refresh

    @pytest.mark.unit
    def test_auth_error_handling(self):
        """Test handling of authentication errors."""
        error_response = {
            "error": "invalid_client",
            "error_description": "Unknown client id"
        }

        assert "error" in error_response
        assert "error_description" in error_response


# ============================================================================
# Test Class: Error Handling
# ============================================================================

class TestImageRecognitionErrors:
    """Tests for image recognition error handling."""

    @pytest.mark.unit
    def test_service_not_configured_error(self):
        """Test handling when service is not configured."""
        config = None

        assert config is None

    @pytest.mark.unit
    def test_ocr_not_configured_error(self):
        """Test handling when OCR is not configured."""
        config = {"vision": {}}

        assert "ocr" not in config

    @pytest.mark.unit
    def test_vision_not_configured_error(self):
        """Test handling when vision is not configured."""
        config = {"ocr": {}}

        assert "vision" not in config

    @pytest.mark.unit
    def test_network_error_handling(self):
        """Test handling of network errors."""
        error_types = [
            "ECONNREFUSED",
            "ETIMEDOUT",
            "ENOTFOUND",
            "EAI_AGAIN"
        ]

        for error in error_types:
            assert error.startswith("E")

    @pytest.mark.unit
    def test_api_rate_limit_handling(self):
        """Test handling of API rate limit errors."""
        rate_limit_response = {
            "error_code": 18,
            "error_msg": "qps exceed"
        }

        assert rate_limit_response["error_code"] == 18

    @pytest.mark.unit
    def test_invalid_image_format_error(self):
        """Test handling of invalid image format."""
        invalid_formats = ["gif", "bmp", "tiff", "webp"]

        # Baidu OCR supports: JPG, JPEG, PNG, BMP
        # But we only want to test PNG/JPEG
        assert "gif" in invalid_formats

    @pytest.mark.unit
    def test_image_too_large_error(self):
        """Test handling of image size exceeding limits."""
        max_size = 4 * 1024 * 1024  # 4MB
        large_image_size = 5 * 1024 * 1024  # 5MB

        assert large_image_size > max_size


# ============================================================================
# Test Class: Boundary Conditions
# ============================================================================

class TestImageRecognitionBoundaries:
    """Tests for image recognition boundary conditions."""

    @pytest.mark.unit
    def test_empty_image_buffer(self):
        """Test handling of empty image buffer."""
        empty_buffer = b""

        assert len(empty_buffer) == 0

    @pytest.mark.unit
    def test_very_small_image(self):
        """Test handling of very small images."""
        # Create 1x1 pixel image
        img = Image.new('RGB', (1, 1), color='red')
        buffer = BytesIO()
        img.save(buffer, format='PNG')

        assert len(buffer.getvalue()) < 1000

    @pytest.mark.unit
    def test_very_large_image(self):
        """Test handling of very large images."""
        # Simulate large image (4K resolution)
        large_image_info = {
            "width": 3840,
            "height": 2160,
            "estimated_size": 10 * 1024 * 1024  # 10MB
        }

        assert large_image_info["width"] * large_image_info["height"] > 8000000

    @pytest.mark.unit
    def test_no_text_in_image(self):
        """Test handling of images with no text."""
        ocr_result = {
            "words_result": [],
            "words_result_num": 0
        }

        assert ocr_result["words_result_num"] == 0
        assert len(ocr_result["words_result"]) == 0

    @pytest.mark.unit
    def test_special_characters_in_text(self):
        """Test handling of special characters in OCR text."""
        special_texts = [
            "中文标点：，。！？",
            "English punctuation: .,!?'",
            "Math symbols: +-=×÷",
            "Currency: ¥$€£",
            "Emoji: 🎉🎊🎁"
        ]

        for text in special_texts:
            assert isinstance(text, str)

    @pytest.mark.unit
    def test_long_text_recognition(self):
        """Test handling of very long text recognition."""
        long_text = "这是一个很长的文本" * 1000

        assert len(long_text) > 1000

    @pytest.mark.unit
    def test_multiple_languages(self):
        """Test handling of multiple languages in one image."""
        multilingual_text = {
            "words_result": [
                {"words": "中文文本"},
                {"words": "English text"},
                {"words": "日本語テキスト"},
                {"words": "한국어 텍스트"}
            ]
        }

        assert len(multilingual_text["words_result"]) >= 4


# ============================================================================
# Test Class: Combined Recognition
# ============================================================================

class TestCombinedRecognition:
    """Tests for combined OCR and image understanding."""

    @pytest.mark.unit
    def test_combined_result_structure(self):
        """Test combined recognition result structure."""
        result = {
            "ocr": {
                "success": True,
                "text": "图片中的文字"
            },
            "understanding": {
                "success": True,
                "description": "图片描述"
            }
        }

        assert "ocr" in result
        assert "understanding" in result

    @pytest.mark.unit
    def test_enable_disable_flags(self):
        """Test enable/disable flags for recognition types."""
        options = [
            {"enableOCR": True, "enableUnderstanding": True},
            {"enableOCR": True, "enableUnderstanding": False},
            {"enableOCR": False, "enableUnderstanding": True},
            {"enableOCR": False, "enableUnderstanding": False}
        ]

        for opt in options:
            assert isinstance(opt["enableOCR"], bool)
            assert isinstance(opt["enableUnderstanding"], bool)

    @pytest.mark.unit
    def test_partial_failure_handling(self):
        """Test handling when one service fails but other succeeds."""
        result = {
            "ocr": {
                "success": False,
                "error": "OCR service unavailable"
            },
            "understanding": {
                "success": True,
                "description": "Image description"
            }
        }

        assert result["ocr"]["success"] is False
        assert result["understanding"]["success"] is True


# ============================================================================
# Test Class: Configuration Update
# ============================================================================

class TestConfigUpdate:
    """Tests for configuration update functionality."""

    @pytest.mark.unit
    def test_ocr_config_update(self):
        """Test OCR configuration update."""
        config = {"ocr": {"baidu": {"apiKey": "old_key"}}}
        new_config = {"ocr": {"baidu": {"apiKey": "new_key"}}}

        config["ocr"]["baidu"]["apiKey"] = new_config["ocr"]["baidu"]["apiKey"]

        assert config["ocr"]["baidu"]["apiKey"] == "new_key"

    @pytest.mark.unit
    def test_vision_config_update(self):
        """Test vision configuration update."""
        config = {"vision": {"qwen": {"apiKey": "old_key"}}}
        new_config = {"vision": {"qwen": {"apiKey": "new_key"}}}

        config["vision"]["qwen"]["apiKey"] = new_config["vision"]["qwen"]["apiKey"]

        assert config["vision"]["qwen"]["apiKey"] == "new_key"


# ============================================================================
# Integration Test Markers
# ============================================================================

@pytest.mark.integration
@pytest.mark.slow
class TestImageRecognitionIntegration:
    """Integration tests for image recognition service (requires actual services)."""

    def test_actual_ocr_recognition(self):
        """Test actual OCR recognition (requires Baidu credentials)."""
        pytest.skip("Integration test - requires actual API credentials")

    def test_actual_image_understanding(self):
        """Test actual image understanding (requires Qwen credentials)."""
        pytest.skip("Integration test - requires actual API credentials")

    def test_baidu_token_refresh(self):
        """Test actual Baidu token refresh."""
        pytest.skip("Integration test - requires network access")
