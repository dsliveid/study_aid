import os
import sys

from PyQt5.QtCore import pyqtSignal
from PyQt5.QtWidgets import (
    QApplication,
    QComboBox,
    QDoubleSpinBox,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QSpinBox,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, project_root)

from speech_recognition.audio_capture import AudioCapture
from speech_recognition.speech_recognizer_with_vad import SpeechRecognizerWithVAD


class MainWindow(QMainWindow):
    recognition_result = pyqtSignal(str)
    recognition_error = pyqtSignal(str)

    def __init__(self):
        super().__init__()
        self.setWindowTitle("语音识别助手 (自动断句)")
        self.setGeometry(100, 100, 800, 700)

        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)

        self.audio_capture = None
        self.recognizer = None
        self.is_recognizing = False

        self.setup_ui()
        self.recognition_result.connect(self.update_text)
        self.recognition_error.connect(self.on_recognition_error)
        self.source_combo.setCurrentText("麦克风")
        self.load_devices()

    def setup_ui(self):
        controls_layout = QHBoxLayout()

        self.source_label = QLabel("音频源:")
        self.source_combo = QComboBox()
        self.source_combo.addItems(["麦克风", "系统音频"])

        self.device_label = QLabel("设备:")
        self.device_combo = QComboBox()

        controls_layout.addWidget(self.source_label)
        controls_layout.addWidget(self.source_combo)
        controls_layout.addWidget(self.device_label)
        controls_layout.addWidget(self.device_combo, 1)

        vad_layout = QFormLayout()
        self.silence_duration_spinbox = QDoubleSpinBox()
        self.silence_duration_spinbox.setRange(0.1, 5.0)
        self.silence_duration_spinbox.setSingleStep(0.1)
        self.silence_duration_spinbox.setValue(1.5)

        self.speech_threshold_spinbox = QSpinBox()
        self.speech_threshold_spinbox.setRange(1, 100)
        self.speech_threshold_spinbox.setValue(2)
        self.speech_threshold_spinbox.setSuffix(" %")

        vad_layout.addRow("静音断句时长 (秒):", self.silence_duration_spinbox)
        vad_layout.addRow("语音激活阈值:", self.speech_threshold_spinbox)

        buttons_layout = QHBoxLayout()
        self.start_button = QPushButton("开始识别")
        self.stop_button = QPushButton("停止识别")
        self.stop_button.setEnabled(False)
        self.status_label = QLabel("状态: 未开始")

        buttons_layout.addWidget(self.start_button)
        buttons_layout.addWidget(self.stop_button)
        buttons_layout.addStretch()
        buttons_layout.addWidget(self.status_label)

        self.result_text = QTextEdit()
        self.result_text.setReadOnly(True)
        self.result_text.setFontPointSize(12)

        self.main_layout.addLayout(controls_layout)
        self.main_layout.addLayout(vad_layout)
        self.main_layout.addLayout(buttons_layout)
        self.main_layout.addWidget(self.result_text)

        self.source_combo.currentIndexChanged.connect(self.load_devices)
        self.start_button.clicked.connect(self.start_recognition)
        self.stop_button.clicked.connect(self.stop_recognition)

    def load_devices(self):
        self.device_combo.clear()
        source = self.source_combo.currentText()

        temp_audio_capture = AudioCapture()
        try:
            if source == "麦克风":
                devices = temp_audio_capture.list_microphone_devices()
            else:
                devices = temp_audio_capture.list_system_audio_devices()
        except Exception as e:
            self.device_combo.addItem("加载设备失败")
            self.result_text.setText(f"错误: {e}")
            devices = []
        finally:
            del temp_audio_capture

        if not devices:
            if not self.device_combo.count():
                self.device_combo.addItem("未找到设备")
            self.device_combo.setEnabled(False)
            self.start_button.setEnabled(False)
        else:
            self.device_combo.setEnabled(True)
            self.start_button.setEnabled(True)
            for device in devices:
                self.device_combo.addItem(device["name"], userData=device)

    def start_recognition(self):
        selected_device_data = self.device_combo.currentData()
        if not selected_device_data:
            self.status_label.setText("状态: 请选择一个有效设备")
            return

        device_index = selected_device_data["index"]
        device_name = selected_device_data["name"]
        source_type = self.source_combo.currentText()

        print(f"开始识别，设备: {device_name} ({source_type})")

        self.result_text.clear()
        self.status_label.setText("状态: 正在初始化...")

        try:
            self.recognizer = SpeechRecognizerWithVAD(
                model_path="whisper_cpp/ggml-base.bin",
                on_speech_recognized=self.recognition_result.emit,
                speech_threshold=self.speech_threshold_spinbox.value() / 100.0,
                silence_duration=self.silence_duration_spinbox.value(),
            )
            self.audio_capture = AudioCapture()

            if source_type == "麦克风":
                sample_rate = self.audio_capture.start_microphone_capture(device_index)
            else:
                sample_rate = self.audio_capture.start_system_audio_capture(device_index)

            if sample_rate is None:
                raise ValueError("无法获取采样率或启动音频捕获失败。")

            self.recognizer.start(self.audio_capture.audio_queue, sample_rate)

            self.start_button.setEnabled(False)
            self.stop_button.setEnabled(True)
            self.set_controls_enabled(False)
            self.status_label.setText("状态: 正在识别...")
            self.is_recognizing = True

        except Exception as e:
            self.status_label.setText(f"状态: 启动失败 - {e}")
            self.stop_recognition()

    def stop_recognition(self):
        if self.recognizer:
            self.recognizer.stop()
            self.recognizer = None
        if self.audio_capture:
            self.audio_capture.stop_capture()
            self.audio_capture = None

        self.start_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.set_controls_enabled(True)
        self.status_label.setText("状态: 已停止")
        self.is_recognizing = False

    def update_text(self, text):
        self.result_text.append(text)
        scrollbar = self.result_text.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def on_recognition_error(self, error_message):
        self.result_text.append(f"\n--- ERROR ---\n{error_message}\n---------------")
        self.status_label.setText("状态: 识别异常")

    def set_controls_enabled(self, enabled):
        self.source_combo.setEnabled(enabled)
        self.device_combo.setEnabled(enabled)
        self.silence_duration_spinbox.setEnabled(enabled)
        self.speech_threshold_spinbox.setEnabled(enabled)

    def closeEvent(self, event):
        self.stop_recognition()
        event.accept()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_win = MainWindow()
    main_win.show()
    sys.exit(app.exec_())
