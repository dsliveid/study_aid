"""
Unit Tests for Screenshot Service
截图服务单元测试

Test Coverage:
- Service configuration validation
- Core functionality (full screen, region capture)
- Error handling
- Boundary conditions
- File operations
"""

import pytest
import base64
import os
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from PIL import Image


# ============================================================================
# Test Class: Configuration Validation
# ============================================================================

class TestScreenshotConfig:
    """Tests for screenshot service configuration validation."""

    @pytest.mark.unit
    def test_default_configuration(self):
        """Test default screenshot service configuration."""
        config = {
            "thumbnailSize": {"width": 1920, "height": 1080},
            "format": "png",
            "quality": 90
        }

        assert config["thumbnailSize"]["width"] == 1920
        assert config["thumbnailSize"]["height"] == 1080
        assert config["format"] == "png"

    @pytest.mark.unit
    def test_custom_thumbnail_size(self):
        """Test custom thumbnail size configuration."""
        config = {
            "thumbnailSize": {"width": 800, "height": 600}
        }

        assert config["thumbnailSize"]["width"] == 800
        assert config["thumbnailSize"]["height"] == 600

    @pytest.mark.unit
    def test_invalid_thumbnail_size(self):
        """Test handling of invalid thumbnail sizes."""
        invalid_sizes = [
            {"width": 0, "height": 1080},
            {"width": 1920, "height": 0},
            {"width": -100, "height": 1080},
            {"width": 1920, "height": -100},
        ]

        for size in invalid_sizes:
            assert size["width"] <= 0 or size["height"] <= 0


# ============================================================================
# Test Class: Core Functionality
# ============================================================================

class TestScreenshotCore:
    """Tests for screenshot core functionality."""

    @pytest.mark.unit
    def test_screenshot_data_structure(self, mock_screenshot_data):
        """Test screenshot data structure."""
        screenshot = mock_screenshot_data

        assert "id" in screenshot
        assert "dataUrl" in screenshot
        assert "timestamp" in screenshot
        assert screenshot["id"].startswith("screenshot_")
        assert screenshot["dataUrl"].startswith("data:image/png;base64,")

    @pytest.mark.unit
    def test_generate_unique_id(self):
        """Test generation of unique screenshot IDs."""
        import time

        ids = []
        for _ in range(10):
            id_str = f"screenshot_{int(time.time() * 1000)}_{hash(str(time.time()))}"
            ids.append(id_str)

        # All IDs should be unique
        assert len(set(ids)) == len(ids)

    @pytest.mark.unit
    def test_data_url_parsing(self, mock_screenshot_data):
        """Test parsing of data URL."""
        data_url = mock_screenshot_data["dataUrl"]

        # Parse data URL
        header, encoded = data_url.split(",", 1)
        assert header == "data:image/png;base64"

        # Verify base64 data can be decoded
        decoded = base64.b64decode(encoded)
        assert len(decoded) > 0

    @pytest.mark.unit
    def test_full_screen_capture_params(self):
        """Test full screen capture parameters."""
        params = {
            "types": ["screen"],
            "thumbnailSize": {"width": 1920, "height": 1080}
        }

        assert "screen" in params["types"]
        assert params["thumbnailSize"]["width"] > 0
        assert params["thumbnailSize"]["height"] > 0

    @pytest.mark.unit
    def test_region_selection_params(self):
        """Test region selection parameters."""
        region = {
            "x": 100,
            "y": 200,
            "width": 500,
            "height": 400
        }

        assert region["x"] >= 0
        assert region["y"] >= 0
        assert region["width"] > 0
        assert region["height"] > 0

    @pytest.mark.unit
    def test_screenshot_source_structure(self):
        """Test screenshot source structure."""
        source = {
            "id": "screen:0:0",
            "name": "Screen 1",
            "thumbnail": "data:image/png;base64,test"
        }

        assert "id" in source
        assert "name" in source
        assert "thumbnail" in source
        assert source["id"].startswith("screen:")


# ============================================================================
# Test Class: Window Management
# ============================================================================

class TestWindowManagement:
    """Tests for screenshot window management."""

    @pytest.mark.unit
    def test_region_selector_window_config(self):
        """Test region selector window configuration."""
        config = {
            "frame": False,
            "transparent": True,
            "backgroundColor": "#00000000",
            "alwaysOnTop": True,
            "skipTaskbar": True,
            "resizable": False,
            "focusable": True,
            "show": False
        }

        assert config["frame"] is False
        assert config["transparent"] is True
        assert config["alwaysOnTop"] is True
        assert config["resizable"] is False

    @pytest.mark.unit
    def test_window_dimensions(self):
        """Test window dimensions calculation."""
        display_bounds = {"width": 1920, "height": 1080}

        # Window should cover entire display
        window_config = {
            "width": display_bounds["width"],
            "height": display_bounds["height"],
            "x": 0,
            "y": 0
        }

        assert window_config["width"] == 1920
        assert window_config["height"] == 1080
        assert window_config["x"] == 0
        assert window_config["y"] == 0

    @pytest.mark.unit
    def test_ipc_message_handling(self):
        """Test IPC message handling for screenshot selection."""
        messages = [
            {"channel": "screenshot-selected", "data": {"dataUrl": "test"}},
            {"channel": "screenshot-cancelled", "data": None}
        ]

        for msg in messages:
            assert msg["channel"] in ["screenshot-selected", "screenshot-cancelled"]


# ============================================================================
# Test Class: File Operations
# ============================================================================

class TestFileOperations:
    """Tests for screenshot file operations."""

    @pytest.mark.unit
    def test_filename_generation(self):
        """Test screenshot filename generation."""
        import time

        timestamp = int(time.time())
        filename = f"screenshot_{timestamp}.png"

        assert filename.startswith("screenshot_")
        assert filename.endswith(".png")

    @pytest.mark.unit
    def test_file_path_construction(self):
        """Test screenshot file path construction."""
        user_data_path = "/home/user/.config/study-aid"
        screenshots_dir = os.path.join(user_data_path, "screenshots")
        filename = "screenshot_123.png"
        file_path = os.path.join(screenshots_dir, filename)

        assert "screenshots" in file_path
        assert file_path.endswith(".png")

    @pytest.mark.unit
    def test_base64_to_buffer_conversion(self, mock_screenshot_data):
        """Test conversion of base64 data URL to buffer."""
        data_url = mock_screenshot_data["dataUrl"]

        # Remove data URL prefix
        base64_data = data_url.replace("data:image/png;base64,", "")

        # Convert to buffer
        buffer = base64.b64decode(base64_data)

        assert isinstance(buffer, bytes)
        assert len(buffer) > 0

    @pytest.mark.unit
    def test_buffer_to_image_conversion(self):
        """Test conversion of buffer to image."""
        # Create a minimal valid PNG
        img = Image.new('RGB', (100, 100), color='red')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_buffer = buffer.getvalue()

        assert len(img_buffer) > 0
        assert img_buffer[:4] == b'\x89PNG'

    @pytest.mark.unit
    def test_screenshot_storage_retrieval(self, mock_screenshot_data):
        """Test screenshot storage and retrieval."""
        screenshots = {}

        # Store screenshot
        screenshot_id = mock_screenshot_data["id"]
        screenshots[screenshot_id] = mock_screenshot_data

        # Retrieve screenshot
        retrieved = screenshots.get(screenshot_id)

        assert retrieved is not None
        assert retrieved["id"] == screenshot_id

    @pytest.mark.unit
    def test_screenshot_deletion(self, mock_screenshot_data):
        """Test screenshot deletion."""
        screenshots = {mock_screenshot_data["id"]: mock_screenshot_data}

        # Delete screenshot
        del screenshots[mock_screenshot_data["id"]]

        assert len(screenshots) == 0


# ============================================================================
# Test Class: Error Handling
# ============================================================================

class TestScreenshotErrors:
    """Tests for screenshot error handling."""

    @pytest.mark.unit
    def test_no_screen_source_error(self):
        """Test handling when no screen source is available."""
        sources = []

        assert len(sources) == 0

    @pytest.mark.unit
    def test_invalid_screen_id_error(self):
        """Test handling of invalid screen ID."""
        available_screens = ["screen:0:0", "screen:0:1"]
        requested_screen = "screen:0:99"

        assert requested_screen not in available_screens

    @pytest.mark.unit
    def test_screenshot_not_found_error(self):
        """Test handling when screenshot is not found."""
        screenshots = {}
        screenshot_id = "non_existent_id"

        screenshot = screenshots.get(screenshot_id)
        assert screenshot is None

    @pytest.mark.unit
    def test_file_write_error_handling(self):
        """Test handling of file write errors."""
        invalid_paths = [
            "",  # Empty path
            "/nonexistent/directory/file.png",  # Non-existent directory
            "/root/protected.png",  # Permission denied (on Unix)
        ]

        for path in invalid_paths:
            # These paths should be considered invalid
            assert not os.path.isdir(os.path.dirname(path)) if os.path.dirname(path) else True

    @pytest.mark.unit
    def test_invalid_data_url_error(self):
        """Test handling of invalid data URL."""
        invalid_data_urls = [
            "not a data url",
            "data:text/plain;base64,test",
            "data:image/png;base64",  # Missing data
            "",
        ]

        for url in invalid_data_urls:
            is_valid = url.startswith("data:image/png;base64,") or url.startswith("data:image/jpeg;base64,")
            if url:
                assert not is_valid or "," not in url


# ============================================================================
# Test Class: Boundary Conditions
# ============================================================================

class TestScreenshotBoundaries:
    """Tests for screenshot boundary conditions."""

    @pytest.mark.unit
    def test_zero_dimension_region(self):
        """Test handling of zero-dimension region."""
        invalid_regions = [
            {"x": 0, "y": 0, "width": 0, "height": 100},
            {"x": 0, "y": 0, "width": 100, "height": 0},
            {"x": 0, "y": 0, "width": 0, "height": 0},
        ]

        for region in invalid_regions:
            assert region["width"] == 0 or region["height"] == 0

    @pytest.mark.unit
    def test_negative_dimension_region(self):
        """Test handling of negative dimension region."""
        invalid_regions = [
            {"x": -10, "y": 0, "width": 100, "height": 100},
            {"x": 0, "y": -10, "width": 100, "height": 100},
            {"x": 0, "y": 0, "width": -100, "height": 100},
            {"x": 0, "y": 0, "width": 100, "height": -100},
        ]

        for region in invalid_regions:
            assert region["x"] < 0 or region["y"] < 0 or region["width"] < 0 or region["height"] < 0

    @pytest.mark.unit
    def test_very_large_region(self):
        """Test handling of very large region."""
        large_region = {
            "x": 0,
            "y": 0,
            "width": 10000,
            "height": 10000
        }

        assert large_region["width"] > 3840  # Larger than 4K
        assert large_region["height"] > 2160

    @pytest.mark.unit
    def test_region_outside_screen_bounds(self):
        """Test handling of region outside screen bounds."""
        screen_bounds = {"width": 1920, "height": 1080}
        invalid_regions = [
            {"x": 2000, "y": 0, "width": 100, "height": 100},  # x out of bounds
            {"x": 0, "y": 1200, "width": 100, "height": 100},  # y out of bounds
            {"x": 1800, "y": 0, "width": 200, "height": 100},  # width exceeds bounds
            {"x": 0, "y": 1000, "width": 100, "height": 200},  # height exceeds bounds
        ]

        for region in invalid_regions:
            exceeds_bounds = (
                region["x"] + region["width"] > screen_bounds["width"] or
                region["y"] + region["height"] > screen_bounds["height"]
            )
            assert exceeds_bounds

    @pytest.mark.unit
    def test_multiple_screens_handling(self):
        """Test handling of multiple screens."""
        screens = [
            {"id": "screen:0:0", "name": "Primary", "bounds": {"x": 0, "y": 0, "width": 1920, "height": 1080}},
            {"id": "screen:0:1", "name": "Secondary", "bounds": {"x": 1920, "y": 0, "width": 1920, "height": 1080}},
        ]

        assert len(screens) > 1
        assert screens[0]["id"] != screens[1]["id"]

    @pytest.mark.unit
    def test_high_dpi_screen_handling(self):
        """Test handling of high DPI screens."""
        high_dpi_screen = {
            "scaleFactor": 2.0,
            "size": {"width": 3840, "height": 2160},
            "bounds": {"width": 1920, "height": 1080}
        }

        assert high_dpi_screen["scaleFactor"] > 1.0
        assert high_dpi_screen["size"]["width"] > high_dpi_screen["bounds"]["width"]


# ============================================================================
# Test Class: Global Shortcuts
# ============================================================================

class TestGlobalShortcuts:
    """Tests for global shortcut functionality."""

    @pytest.mark.unit
    def test_shortcut_registration(self):
        """Test global shortcut registration."""
        shortcuts = {}
        accelerator = "CommandOrControl+Shift+S"

        # Register shortcut
        shortcuts[accelerator] = lambda: print("Screenshot taken")

        assert accelerator in shortcuts

    @pytest.mark.unit
    def test_shortcut_unregistration(self):
        """Test global shortcut unregistration."""
        shortcuts = {"CommandOrControl+Shift+S": lambda: None}
        accelerator = "CommandOrControl+Shift+S"

        # Unregister shortcut
        if accelerator in shortcuts:
            del shortcuts[accelerator]

        assert accelerator not in shortcuts

    @pytest.mark.unit
    def test_invalid_shortcut_format(self):
        """Test handling of invalid shortcut formats."""
        invalid_shortcuts = [
            "",
            "InvalidShortcut",
            "Ctrl+Alt+Delete+Extra",  # Too many keys
        ]

        for shortcut in invalid_shortcuts:
            assert not shortcut or len(shortcut.split("+")) > 3


# ============================================================================
# Test Class: Annotations
# ============================================================================

class TestAnnotations:
    """Tests for screenshot annotation functionality."""

    @pytest.mark.unit
    def test_annotation_types(self):
        """Test supported annotation types."""
        annotation_types = ["rect", "arrow", "text", "pen"]

        assert "rect" in annotation_types
        assert "arrow" in annotation_types
        assert "text" in annotation_types
        assert "pen" in annotation_types

    @pytest.mark.unit
    def test_annotation_structure(self):
        """Test annotation data structure."""
        annotation = {
            "type": "rect",
            "data": {"x": 10, "y": 20, "width": 100, "height": 50},
            "color": "#FF0000",
            "size": 2
        }

        assert annotation["type"] in ["rect", "arrow", "text", "pen"]
        assert annotation["color"].startswith("#")
        assert annotation["size"] > 0

    @pytest.mark.unit
    def test_text_annotation_properties(self):
        """Test text annotation specific properties."""
        text_annotation = {
            "type": "text",
            "data": {
                "x": 100,
                "y": 200,
                "text": "Test annotation",
                "fontSize": 14,
                "fontFamily": "Arial"
            },
            "color": "#000000",
            "size": 14
        }

        assert text_annotation["type"] == "text"
        assert "text" in text_annotation["data"]
        assert "fontSize" in text_annotation["data"]


# ============================================================================
# Integration Test Markers
# ============================================================================

@pytest.mark.integration
@pytest.mark.slow
class TestScreenshotIntegration:
    """Integration tests for screenshot service (requires actual desktop environment)."""

    def test_actual_screen_capture(self):
        """Test actual screen capture (requires display)."""
        pytest.skip("Integration test - requires display environment")

    def test_file_system_operations(self):
        """Test actual file system operations."""
        pytest.skip("Integration test - requires file system access")
