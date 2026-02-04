# 非流式 Whisper.cpp 集成调试记录

本文档记录了在将 `whisper.cpp` 集成到实时语音识别应用（非流式）过程中遇到的一系列问题及其解决方案。

## 1. 初始问题：模型无法加载与音频失真

- **问题描述**:
  - 程序启动时，无法正确加载 `ggml-tiny.bin` 模型。
  - 即使切换到 `ggml-base.bin` 模型，识别出的音频也存在严重的失真和乱码。

- **解决方案**:
  - **模型切换**: 将代码中引用的模型路径从 `ggml-tiny.bin` 更改为 `ggml-base.bin`，确保模型文件存在且路径正确。
  - **音频失真**: 经过分析，发现问题出在音频重采样环节。通过在 `audio_capture.py` 中引入 `librosa` 库进行高质量的重采样，替代了原有的简易实现，解决了音频失真问题。

## 2. `whisper.cpp` 无法自动检测语言

- **问题描述**:
  - `whisper.cpp` 在接收到音频文件后，未能执行识别，日志显示 `unknown language 'auto'`。

- **解决方案**:
  - **参数修正**: 查阅 `whisper.cpp` 的文档后发现，其命令行参数不支持 `-l auto`。因此，在 `speech_recognizer_non_stream.py` 中，将调用参数从 `-l auto` 硬编码为 `-l zh`，以专门处理中文语音。

## 3. Python 端解码与属性错误

- **问题描述**:
  - `whisper.cpp` 成功处理了音频并输出了结果，但 Python 端在捕获其 `stdout` 时崩溃，报错 `UnicodeDecodeError: 'gbk' codec can't decode byte...`，并随之引发 `AttributeError: 'NoneType' object has no attribute 'strip'`。

- **解决方案**:
  - **编码指定**: `subprocess.run` 在 Windows 上默认使用 `gbk` 编码，而 `whisper.cpp` 的输出是 `UTF-8`。通过在 `subprocess.run` 调用中明确添加 `encoding='utf-8'` 参数，解决了编码不匹配的问题，确保 `stdout` 被正确解码。

## 4. 识别结果为繁体中文

- **问题描述**:
  - 语音识别结果正确，但输出的是繁体中文，需要转换为简体。

- **解决方案**:
  - **集成 OpenCC**:
    1.  在 `requirements.txt` 中添加 `opencc-python-reimplemented` 依赖。
    2.  安装该库。
    3.  在 `speech_recognizer_non_stream.py` 中，初始化 `OpenCC('t2s')` 转换器。
    4.  在获取到 `whisper.cpp` 的识别结果后，调用 `cc.convert()` 方法将繁体文本转换为简体。

## 5. `OpenCC` 配置文件加载失败

- **问题描述**:
  - 集成 `OpenCC` 后，程序启动时报错 `FileNotFoundError`，提示找不到 `t2s.json.json`。

- **解决方案**:
  - **路径修正**: `opencc-python-reimplemented` 库会自动为配置文件名添加 `.json` 后缀。因此，将 `OpenCC('t2s.json')` 的调用修改为 `OpenCC('t2s')`，解决了路径错误。

## 6. 默认保留临时文件

- **问题描述**:
  - 应用程序启动后，默认会勾选“保留临时文件”选项，用户希望默认不保留。

- **解决方案**:
  - **UI 逻辑修改**: 在 `main_window_non_stream.py` 中，将 `self.keep_files_checkbox.setChecked(True)` 修改为 `self.keep_files_checkbox.setChecked(False)`，将复选框的默认状态设置为未选中。

通过以上一系列调试和修复，最终实现了稳定、准确的中文语音识别功能，并满足了用户的全部需求。