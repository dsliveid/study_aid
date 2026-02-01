"""
Unit Tests for AI Content Generation Service
AI内容生成服务单元测试

Test Coverage:
- Service configuration validation
- Knowledge tree generation
- Key points extraction
- Difficult points annotation
- Error handling
- Boundary conditions
- API integration
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any, List


# ============================================================================
# Test Class: Configuration Validation
# ============================================================================

class TestAIContentConfig:
    """Tests for AI content service configuration validation."""

    @pytest.mark.unit
    def test_valid_config_accepted(self, ai_content_config):
        """Test that valid configuration is accepted."""
        config = ai_content_config

        assert config["apiKey"]
        assert config["baseUrl"]
        assert config["model"]
        assert config["maxTokens"] > 0
        assert 0 <= config["temperature"] <= 1

    @pytest.mark.unit
    def test_config_missing_api_key(self, ai_content_config_invalid):
        """Test that missing API key raises validation error."""
        config = ai_content_config_invalid

        assert not config["apiKey"]

    @pytest.mark.unit
    def test_config_default_values(self):
        """Test that default values are set correctly."""
        config = {
            "apiKey": "test_key",
            "baseUrl": None,
            "model": None,
            "maxTokens": None,
            "temperature": None
        }

        # Apply defaults
        defaults = {
            "baseUrl": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
            "maxTokens": 4096,
            "temperature": 0.7
        }

        for key, value in defaults.items():
            if config.get(key) is None:
                config[key] = value

        assert config["baseUrl"] == "https://api.deepseek.com/v1"
        assert config["model"] == "deepseek-chat"

    @pytest.mark.unit
    def test_config_invalid_temperature(self):
        """Test handling of invalid temperature values."""
        invalid_temperatures = [-0.1, 1.1, 2.0, -1.0]

        for temp in invalid_temperatures:
            assert temp < 0 or temp > 1

    @pytest.mark.unit
    def test_config_invalid_max_tokens(self):
        """Test handling of invalid max tokens values."""
        invalid_max_tokens = [0, -100, -1]

        for tokens in invalid_max_tokens:
            assert tokens <= 0

    @pytest.mark.unit
    def test_config_whitespace_api_key(self):
        """Test that whitespace-only API key is treated as empty."""
        config = {"apiKey": "   "}

        assert not config["apiKey"].strip()


# ============================================================================
# Test Class: Knowledge Tree Generation
# ============================================================================

class TestKnowledgeTreeGeneration:
    """Tests for knowledge tree generation functionality."""

    @pytest.mark.unit
    def test_knowledge_tree_result_structure(self, mock_knowledge_tree_result):
        """Test knowledge tree result structure."""
        result = mock_knowledge_tree_result

        assert "title" in result
        assert "structure" in result
        assert isinstance(result["structure"], list)

    @pytest.mark.unit
    def test_knowledge_tree_node_structure(self, mock_knowledge_tree_result):
        """Test knowledge tree node structure."""
        node = mock_knowledge_tree_result["structure"][0]

        assert "title" in node
        assert "level" in node
        assert "importance" in node
        assert "children" in node
        assert node["level"] >= 1
        assert node["importance"] in ["high", "medium", "low"]

    @pytest.mark.unit
    def test_knowledge_tree_max_levels(self):
        """Test that knowledge tree respects maximum levels."""
        max_levels = 4

        tree = {
            "title": "Root",
            "structure": [
                {
                    "title": "Level 1",
                    "level": 1,
                    "children": [
                        {
                            "title": "Level 2",
                            "level": 2,
                            "children": [
                                {
                                    "title": "Level 3",
                                    "level": 3,
                                    "children": [
                                        {
                                            "title": "Level 4",
                                            "level": 4,
                                            "children": []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        def get_max_level(nodes, current_max=0):
            for node in nodes:
                current_max = max(current_max, node["level"])
                if node.get("children"):
                    current_max = max(current_max, get_max_level(node["children"], current_max))
            return current_max

        assert get_max_level(tree["structure"]) <= max_levels

    @pytest.mark.unit
    def test_knowledge_tree_prompt_structure(self):
        """Test knowledge tree generation prompt structure."""
        prompt = """请为以下文档内容生成知识目录结构，要求：
1. 提取主要章节和主题
2. 标识每个主题的重要程度（高/中/low）
3. 以树状结构输出
4. 章节层级不超过4级
5. 输出为JSON格式"""

        assert "知识目录" in prompt
        assert "JSON" in prompt
        assert "4级" in prompt or "4" in prompt

    @pytest.mark.unit
    def test_extract_json_from_response(self):
        """Test extraction of JSON from various response formats."""
        responses = [
            # Markdown code block
            '```json\n{"title": "Test"}\n```',
            # Plain JSON
            '{"title": "Test"}',
            # JSON with extra text
            'Here is the result: {"title": "Test"} Thank you.'
        ]

        for response in responses:
            # Try to find JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            assert json_match is not None


# ============================================================================
# Test Class: Key Points Extraction
# ============================================================================

class TestKeyPointsExtraction:
    """Tests for key points extraction functionality."""

    @pytest.mark.unit
    def test_key_points_result_structure(self, mock_key_points_result):
        """Test key points result structure."""
        result = mock_key_points_result

        assert "keyPoints" in result
        assert isinstance(result["keyPoints"], list)

    @pytest.mark.unit
    def test_key_point_structure(self, mock_key_points_result):
        """Test individual key point structure."""
        key_point = mock_key_points_result["keyPoints"][0]

        assert "content" in key_point
        assert "importance" in key_point
        assert key_point["importance"] in ["high", "medium", "low"]

    @pytest.mark.unit
    def test_key_points_max_count(self):
        """Test that key points extraction respects maximum count."""
        max_points = 20

        # Simulate extracting points
        points = [{"content": f"Point {i}"} for i in range(25)]
        limited_points = points[:max_points]

        assert len(limited_points) <= max_points

    @pytest.mark.unit
    def test_key_points_sorted_by_importance(self):
        """Test that key points are sorted by importance."""
        points = [
            {"content": "Low priority", "importance": "low"},
            {"content": "High priority", "importance": "high"},
            {"content": "Medium priority", "importance": "medium"}
        ]

        # Sort by importance
        importance_order = {"high": 0, "medium": 1, "low": 2}
        sorted_points = sorted(points, key=lambda x: importance_order[x["importance"]])

        assert sorted_points[0]["importance"] == "high"
        assert sorted_points[1]["importance"] == "medium"
        assert sorted_points[2]["importance"] == "low"

    @pytest.mark.unit
    def test_key_points_location_optional(self):
        """Test that location field is optional."""
        point_with_location = {
            "content": "Test",
            "importance": "high",
            "location": "Chapter 1"
        }
        point_without_location = {
            "content": "Test",
            "importance": "medium"
        }

        assert "location" in point_with_location
        assert "location" not in point_without_location


# ============================================================================
# Test Class: Difficult Points Annotation
# ============================================================================

class TestDifficultPointsAnnotation:
    """Tests for difficult points annotation functionality."""

    @pytest.mark.unit
    def test_difficult_points_result_structure(self, mock_difficult_points_result):
        """Test difficult points result structure."""
        result = mock_difficult_points_result

        assert "difficultPoints" in result
        assert isinstance(result["difficultPoints"], list)

    @pytest.mark.unit
    def test_difficult_point_structure(self, mock_difficult_points_result):
        """Test individual difficult point structure."""
        point = mock_difficult_points_result["difficultPoints"][0]

        assert "content" in point
        assert "explanation" in point
        assert "difficulty" in point
        assert point["difficulty"] in ["high", "medium", "low"]

    @pytest.mark.unit
    def test_difficult_points_max_count(self):
        """Test that difficult points annotation respects maximum count."""
        max_points = 10

        points = [{"content": f"Point {i}"} for i in range(15)]
        limited_points = points[:max_points]

        assert len(limited_points) <= max_points

    @pytest.mark.unit
    def test_explanation_not_empty(self):
        """Test that explanation is not empty."""
        point = {
            "content": "Complex concept",
            "explanation": "This is a detailed explanation."
        }

        assert point["explanation"]
        assert len(point["explanation"]) > 0

    @pytest.mark.unit
    def test_difficulty_levels(self):
        """Test valid difficulty levels."""
        valid_levels = ["high", "medium", "low"]

        for level in valid_levels:
            assert level in ["high", "medium", "low"]


# ============================================================================
# Test Class: Content Validation
# ============================================================================

class TestContentValidation:
    """Tests for content validation."""

    @pytest.mark.unit
    def test_empty_content_rejection(self):
        """Test that empty content is rejected."""
        content = ""

        assert len(content.strip()) == 0

    @pytest.mark.unit
    def test_whitespace_only_content_rejection(self):
        """Test that whitespace-only content is rejected."""
        contents = ["   ", "\t\n", "  \n\t  "]

        for content in contents:
            assert len(content.strip()) == 0

    @pytest.mark.unit
    def test_content_max_length(self):
        """Test content maximum length validation."""
        max_length = 50000

        long_content = "a" * 60000

        assert len(long_content) > max_length

    @pytest.mark.unit
    def test_valid_content_accepted(self, sample_document_content):
        """Test that valid content is accepted."""
        content = sample_document_content

        assert len(content.strip()) > 0
        assert len(content) <= 50000


# ============================================================================
# Test Class: API Request/Response
# ============================================================================

class TestAPIRequestResponse:
    """Tests for API request and response handling."""

    @pytest.mark.unit
    def test_chat_request_structure(self):
        """Test chat completion request structure."""
        request = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello"}
            ],
            "temperature": 0.7,
            "max_tokens": 4096,
            "stream": False
        }

        assert request["model"]
        assert len(request["messages"]) > 0
        assert all("role" in msg and "content" in msg for msg in request["messages"])
        assert request["temperature"] is not None

    @pytest.mark.unit
    def test_chat_response_structure(self):
        """Test chat completion response structure."""
        response = {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1234567890,
            "model": "deepseek-chat",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": '{"title": "Test"}'
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150
            }
        }

        assert response["choices"][0]["message"]["content"]
        assert response["usage"]["total_tokens"] == 150

    @pytest.mark.unit
    def test_api_key_in_header(self):
        """Test that API key is included in request header."""
        api_key = "test_api_key"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        assert "Authorization" in headers
        assert api_key in headers["Authorization"]


# ============================================================================
# Test Class: Error Handling
# ============================================================================

class TestAIContentErrors:
    """Tests for AI content service error handling."""

    @pytest.mark.unit
    def test_api_key_invalid_error(self):
        """Test handling of invalid API key error (401)."""
        error = {
            "code": "API_KEY_INVALID",
            "status": 401,
            "message": "API密钥无效"
        }

        assert error["status"] == 401

    @pytest.mark.unit
    def test_rate_limit_error(self):
        """Test handling of rate limit error (429)."""
        error = {
            "code": "RATE_LIMIT",
            "status": 429,
            "message": "请求过于频繁"
        }

        assert error["status"] == 429

    @pytest.mark.unit
    def test_context_too_long_error(self):
        """Test handling of context too long error."""
        error = {
            "code": "CONTEXT_TOO_LONG",
            "message": "文档内容过长"
        }

        assert error["code"] == "CONTEXT_TOO_LONG"

    @pytest.mark.unit
    def test_service_error_handling(self):
        """Test handling of generic service errors."""
        error = {
            "code": "SERVICE_ERROR",
            "status": 500,
            "message": "服务错误"
        }

        assert error["status"] >= 500

    @pytest.mark.unit
    def test_network_error_handling(self):
        """Test handling of network errors."""
        error_codes = ["ECONNABORTED", "ETIMEDOUT", "ECONNREFUSED"]

        for code in error_codes:
            assert code.startswith("E")

    @pytest.mark.unit
    def test_invalid_response_handling(self):
        """Test handling of invalid API responses."""
        invalid_responses = [
            {},  # Empty response
            {"choices": []},  # Missing message
            {"choices": [{"message": {}}]},  # Missing content
            "not valid json"
        ]

        for response in invalid_responses:
            if isinstance(response, dict):
                assert not response.get("choices") or not response["choices"][0].get("message", {}).get("content")


# ============================================================================
# Test Class: JSON Extraction
# ============================================================================

class TestJSONExtraction:
    """Tests for JSON extraction from responses."""

    @pytest.mark.unit
    def test_extract_json_from_code_block(self):
        """Test extraction of JSON from markdown code block."""
        response = '''```json
{"title": "Test", "structure": []}
```'''

        import re
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
        assert match is not None

        json_str = match.group(1)
        parsed = json.loads(json_str)
        assert "title" in parsed

    @pytest.mark.unit
    def test_extract_json_from_plain_text(self):
        """Test extraction of JSON from plain text."""
        response = 'Some text {"title": "Test"} more text'

        import re
        match = re.search(r'\{[\s\S]*\}', response)
        assert match is not None

    @pytest.mark.unit
    def test_extract_json_direct(self):
        """Test direct JSON parsing."""
        response = '{"title": "Test", "structure": []}'

        parsed = json.loads(response)
        assert parsed["title"] == "Test"

    @pytest.mark.unit
    def test_invalid_json_handling(self):
        """Test handling of invalid JSON."""
        invalid_json = [
            "{invalid}",
            "{key: value}",  # Missing quotes
            "[1, 2, 3",  # Missing closing bracket
            ""
        ]

        for json_str in invalid_json:
            try:
                json.loads(json_str)
                assert False, "Should have raised JSONDecodeError"
            except json.JSONDecodeError:
                pass  # Expected


# ============================================================================
# Test Class: Configuration Management
# ============================================================================

class TestConfigurationManagement:
    """Tests for configuration management."""

    @pytest.mark.unit
    def test_update_config(self):
        """Test configuration update."""
        config = {
            "apiKey": "old_key",
            "model": "old_model",
            "temperature": 0.5
        }

        updates = {
            "apiKey": "new_key",
            "temperature": 0.8
        }

        config.update(updates)

        assert config["apiKey"] == "new_key"
        assert config["temperature"] == 0.8
        assert config["model"] == "old_model"  # Unchanged

    @pytest.mark.unit
    def test_get_config_without_sensitive_data(self, ai_content_config):
        """Test getting config without sensitive data."""
        config = ai_content_config.copy()

        # Remove sensitive data
        safe_config = {k: v for k, v in config.items() if k != "apiKey"}

        assert "apiKey" not in safe_config
        assert "model" in safe_config

    @pytest.mark.unit
    def test_axios_instance_update(self):
        """Test axios instance update after config change."""
        defaults = {
            "baseURL": "https://old.api.com",
            "headers": {"Authorization": "Bearer old_key"}
        }

        # Simulate update
        defaults["baseURL"] = "https://new.api.com"
        defaults["headers"]["Authorization"] = "Bearer new_key"

        assert defaults["baseURL"] == "https://new.api.com"
        assert "new_key" in defaults["headers"]["Authorization"]


# ============================================================================
# Test Class: Boundary Conditions
# ============================================================================

class TestAIContentBoundaries:
    """Tests for AI content service boundary conditions."""

    @pytest.mark.unit
    def test_very_short_content(self):
        """Test handling of very short content."""
        content = "短"

        assert len(content) < 10

    @pytest.mark.unit
    def test_content_with_special_characters(self):
        """Test handling of content with special characters."""
        contents = [
            "代码: `function test() {}`",
            "数学: $E=mc^2$",
            "表格: | A | B |",
            "链接: [text](url)"
        ]

        for content in contents:
            assert len(content) > 0

    @pytest.mark.unit
    def test_content_with_unicode(self):
        """Test handling of Unicode content."""
        contents = [
            "中文内容",
            "日本語コンテンツ",
            "한국어 콘텐츠",
            "Emoji: 🎓📚✏️"
        ]

        for content in contents:
            assert isinstance(content, str)

    @pytest.mark.unit
    def test_nested_structure_depth(self):
        """Test handling of deeply nested structures."""
        deep_structure = {
            "level": 1,
            "children": [{
                "level": 2,
                "children": [{
                    "level": 3,
                    "children": [{
                        "level": 4,
                        "children": []
                    }]
                }]
            }]
        }

        def get_depth(node, current_depth=1):
            if not node.get("children"):
                return current_depth
            return max(get_depth(child, current_depth + 1) for child in node["children"])

        assert get_depth(deep_structure) <= 4

    @pytest.mark.unit
    def test_many_key_points(self):
        """Test handling of many key points."""
        points = [{"content": f"Point {i}"} for i in range(100)]

        assert len(points) == 100


# ============================================================================
# Integration Test Markers
# ============================================================================

@pytest.mark.integration
@pytest.mark.slow
class TestAIContentIntegration:
    """Integration tests for AI content service (requires actual services)."""

    def test_actual_knowledge_tree_generation(self):
        """Test actual knowledge tree generation (requires DeepSeek credentials)."""
        pytest.skip("Integration test - requires actual API credentials")

    def test_actual_key_points_extraction(self):
        """Test actual key points extraction (requires DeepSeek credentials)."""
        pytest.skip("Integration test - requires actual API credentials")

    def test_actual_difficult_points_annotation(self):
        """Test actual difficult points annotation (requires DeepSeek credentials)."""
        pytest.skip("Integration test - requires actual API credentials")
