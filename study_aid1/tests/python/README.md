# 桌面学习助手 Python 单元测试

## 概述

本目录包含桌面学习助手项目的 Python 单元测试脚本，使用 pytest 框架编写。

## 测试覆盖范围

| 服务 | 测试文件 | 用例数 | 描述 |
|------|----------|--------|------|
| 语音识别服务 | `test_speech_recognition.py` | 24+ | WebSocket连接、音频处理、结果解析 |
| 截图服务 | `test_screenshot.py` | 25+ | 全屏/区域截图、文件操作、窗口管理 |
| 图像识别服务 | `test_image_recognition.py` | 31+ | OCR识别、图像理解、API集成 |
| AI内容生成服务 | `test_ai_content.py` | 32+ | 知识树生成、要点提取、疑难点标注 |
| 自动更新服务 | `test_updater.py` | 20+ | 更新检查、下载进度、状态管理 |

## 目录结构

```
tests/python/
├── __init__.py                 # 包初始化
├── conftest.py                 # pytest 共享 fixture
├── requirements.txt            # Python 依赖
├── README.md                   # 本文件
├── test_speech_recognition.py  # 语音识别服务测试
├── test_screenshot.py          # 截图服务测试
├── test_image_recognition.py   # 图像识别服务测试
├── test_ai_content.py          # AI内容生成服务测试
└── test_updater.py             # 自动更新服务测试
```

## 环境要求

- Python 3.9+
- pytest 7.4+
- pytest-asyncio 0.21+
- pytest-cov 4.1+
- pytest-mock 3.11+
- Pillow 10.0+

## 安装依赖

```bash
cd tests/python
pip install -r requirements.txt
```

## 运行测试

### 使用 pytest 直接运行

```bash
# 运行所有测试
cd tests/python
pytest

# 运行特定服务测试
pytest test_speech_recognition.py
pytest test_screenshot.py
pytest test_image_recognition.py
pytest test_ai_content.py
pytest test_updater.py

# 详细输出
pytest -v

# 生成覆盖率报告
pytest --cov=src --cov-report=html --cov-report=term-missing

# 生成HTML测试报告
pytest --html=report.html --self-contained-html

# 生成JUnit XML报告
pytest --junitxml=report.xml
```

### 使用自动化脚本运行

```bash
# 运行所有测试
python scripts/testing/run_tests.py

# 运行特定服务测试
python scripts/testing/run_tests.py --service speech
python scripts/testing/run_tests.py --service screenshot
python scripts/testing/run_tests.py --service image
python scripts/testing/run_tests.py --service ai
python scripts/testing/run_tests.py --service updater

# 生成覆盖率报告
python scripts/testing/run_tests.py --coverage

# 生成所有报告
python scripts/testing/run_tests.py --coverage --html --xml
```

## 测试标记

测试用例使用以下标记进行分类：

| 标记 | 描述 |
|------|------|
| `@pytest.mark.unit` | 单元测试 |
| `@pytest.mark.integration` | 集成测试 |
| `@pytest.mark.slow` | 慢速测试 |
| `@pytest.mark.speech` | 语音识别相关 |
| `@pytest.mark.screenshot` | 截图相关 |
| `@pytest.mark.image` | 图像识别相关 |
| `@pytest.mark.ai` | AI内容生成相关 |
| `@pytest.mark.updater` | 自动更新相关 |

### 按标记运行测试

```bash
# 只运行单元测试
pytest -m unit

# 只运行语音识别测试
pytest -m speech

# 排除慢速测试
pytest -m "not slow"

# 运行单元测试且非慢速
pytest -m "unit and not slow"
```

## 测试 Fixture

`conftest.py` 中定义的共享 fixture：

### 配置 Fixture

- `speech_recognition_config` - 有效的语音识别配置
- `speech_recognition_config_invalid` - 无效的语音识别配置
- `ai_content_config` - 有效的AI内容配置
- `image_recognition_config` - 有效的图像识别配置
- `updater_config` - 有效的更新服务配置

### 数据 Fixture

- `mock_screenshot_data` - 模拟截图数据
- `mock_recognition_result` - 模拟语音识别结果
- `mock_ocr_result` - 模拟OCR结果
- `mock_image_understanding_result` - 模拟图像理解结果
- `mock_knowledge_tree_result` - 模拟知识树结果
- `mock_key_points_result` - 模拟要点提取结果
- `mock_difficult_points_result` - 模拟疑难点标注结果
- `mock_update_info` - 模拟更新信息

### Mock Fixture

- `mock_websocket` - 模拟 WebSocket
- `mock_axios_instance` - 模拟 Axios HTTP 客户端
- `mock_browser_window` - 模拟 Electron BrowserWindow
- `mock_desktop_capturer` - 模拟 desktopCapturer
- `mock_auto_updater` - 模拟 autoUpdater

### 工具 Fixture

- `sample_document_content` - 示例文档内容
- `sample_audio_buffer` - 示例音频缓冲区
- `sample_image_buffer` - 示例图像缓冲区
- `test_timeout` - 测试超时配置

## 生成缺陷报告

当测试失败时，可以使用缺陷报告生成脚本：

```bash
# 从 JUnit XML 生成缺陷报告
python scripts/testing/generate_bug_report.py --input test-results.xml --format markdown

# 从 JSON 报告生成并指定服务
python scripts/testing/generate_bug_report.py --input report.json --service speech --format json

# 生成报告到指定文件
python scripts/testing/generate_bug_report.py --input results.xml --output bugs.md --format markdown
```

## 测试最佳实践

1. **测试命名**: 使用描述性的测试名称，如 `test_valid_config_accepted`
2. **测试隔离**: 每个测试应该独立运行，不依赖其他测试
3. **使用 Fixture**: 利用 `conftest.py` 中的共享 fixture 减少重复代码
4. **标记测试**: 使用适当的标记对测试进行分类
5. **边界测试**: 确保测试边界条件和异常情况
6. **Mock 外部依赖**: 使用 Mock 隔离外部服务依赖

## 持续集成

在 CI/CD 管道中运行测试：

```yaml
# GitHub Actions 示例
- name: Run Python Tests
  run: |
    pip install -r tests/python/requirements.txt
    pytest tests/python/ -v --cov=src --cov-report=xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.xml
```

## 故障排除

### 常见问题

1. **ModuleNotFoundError**: 确保已安装所有依赖
   ```bash
   pip install -r tests/python/requirements.txt
   ```

2. **Permission Denied**: 确保有执行权限
   ```bash
   chmod +x scripts/testing/*.py
   ```

3. **Import Error**: 确保从项目根目录运行测试
   ```bash
   cd /path/to/study_aid
   pytest tests/python/
   ```

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-01-31 | 初始版本，包含5个服务的测试 |
