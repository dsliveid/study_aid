import sys
import os
import queue

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QComboBox, QPushButton, QTextEdit, QLabel, QCheckBox)
from PyQt5.QtCore import QThread, pyqtSignal

from speech_recognition.audio_capture import AudioCapture
from speech_recognition.speech_recognizer import SpeechRecognizer

class RecognitionWorker(QThread):
    """
    A worker thread to handle the speech recognition process, preventing the UI from freezing.
    """
    update_result = pyqtSignal(str)
    recognition_error = pyqtSignal(str)
    # 添加一个请求停止的信号
    request_stop = pyqtSignal()

    def __init__(self, audio_queue, sample_rate, keep_temp_files):
        super().__init__()
        self.audio_queue = audio_queue
        self.sample_rate = sample_rate
        self.recognizer = SpeechRecognizer(keep_temp_files=keep_temp_files)
        self._is_running = False
        # 连接请求停止信号到槽
        self.request_stop.connect(self.initiate_stop)

    def run(self):
        self._is_running = True
        try:
            self.recognizer.start(self.audio_queue, self.sample_rate)
            while self._is_running:
                result = self.recognizer.get_result(timeout=0.1) # 使用更短的超时以快速响应停止
                if result:
                    self.update_result.emit(result)
        except Exception as e:
            self.recognition_error.emit(f"识别线程出错: {e}")
        finally:
            # 确保识别器在线程结束时停止
            if self.recognizer:
                self.recognizer.stop()

    def initiate_stop(self):
        """槽函数，用于从主线程接收停止请求"""
        self._is_running = False

    def stop(self):
        """请求工作线程停止。这是非阻塞的。"""
        if self._is_running:
            self.request_stop.emit()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("语音识别助手")
        self.setGeometry(100, 100, 800, 600)

        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)

        self.audio_capture = AudioCapture()
        self.recognition_worker = None
        self.is_recognizing = False

        self.setup_ui()
        self.load_devices()

    def setup_ui(self):
        # Top controls layout
        controls_layout = QHBoxLayout()
        
        self.source_label = QLabel("音频源:")
        self.source_combo = QComboBox()
        self.source_combo.addItems(["麦克风", "系统音频"])
        
        self.device_label = QLabel("设备:")
        self.device_combo = QComboBox()

        controls_layout.addWidget(self.source_label)
        controls_layout.addWidget(self.source_combo)
        controls_layout.addWidget(self.device_label)
        controls_layout.addWidget(self.device_combo, 1) # Give combo box more space

        # Buttons layout
        buttons_layout = QHBoxLayout()
        self.toggle_button = QPushButton("开始识别")
        self.keep_files_checkbox = QCheckBox("保留临时文件")
        self.keep_files_checkbox.setChecked(True) # 默认勾选
        self.status_label = QLabel("状态: 未开始")
        
        buttons_layout.addWidget(self.toggle_button)
        buttons_layout.addWidget(self.keep_files_checkbox)
        buttons_layout.addStretch()
        buttons_layout.addWidget(self.status_label)

        # Result display
        self.result_text = QTextEdit()
        self.result_text.setReadOnly(True)
        self.result_text.setFontPointSize(12)

        # Add widgets to main layout
        self.main_layout.addLayout(controls_layout)
        self.main_layout.addLayout(buttons_layout)
        self.main_layout.addWidget(self.result_text)

        # Connect signals
        self.source_combo.currentIndexChanged.connect(self.load_devices)
        self.toggle_button.clicked.connect(self.toggle_recognition)

    def load_devices(self):
        self.device_combo.clear()
        source = self.source_combo.currentText()
        
        try:
            if source == "麦克风":
                devices = self.audio_capture.list_microphone_devices()
            else:  # 系统音频
                devices = self.audio_capture.list_system_audio_devices()
        except Exception as e:
            self.device_combo.addItem("加载设备失败")
            self.result_text.setText(f"错误: {e}")
            devices = []

        if not devices:
            if not self.device_combo.count():
                self.device_combo.addItem("未找到设备")
            self.device_combo.setEnabled(False)
            self.toggle_button.setEnabled(False)
        else:
            self.device_combo.setEnabled(True)
            self.toggle_button.setEnabled(True)
            for device in devices:
                self.device_combo.addItem(device['name'], userData=device)

    def toggle_recognition(self):
        if not self.is_recognizing:
            self.start_recognition()
        else:
            self.stop_recognition()

    def start_recognition(self):
        selected_device_data = self.device_combo.currentData()
        if not selected_device_data:
            self.status_label.setText("状态: 请选择一个有效设备")
            return

        device_index = selected_device_data['index']
        source_type = self.source_combo.currentText()
        
        try:
            if source_type == "麦克风":
                sample_rate = self.audio_capture.start_microphone_capture(device_index)
            else:
                sample_rate = self.audio_capture.start_system_audio_capture(device_index)
            
            if sample_rate is None:
                raise ValueError("无法获取采样率或启动音频捕获失败。")

            self.is_recognizing = True
            self.toggle_button.setText("停止识别")
            self.status_label.setText("状态: 正在识别...")
            self.source_combo.setEnabled(False)
            self.device_combo.setEnabled(False)
            self.result_text.clear()

            # 获取复选框状态并传递给 Worker
            keep_temp_files = self.keep_files_checkbox.isChecked()
            self.recognition_worker = RecognitionWorker(self.audio_capture.audio_queue, sample_rate, keep_temp_files)
            self.recognition_worker.update_result.connect(self.append_result)
            self.recognition_worker.recognition_error.connect(self.on_recognition_error)
            self.recognition_worker.finished.connect(self.on_worker_finished)
            self.recognition_worker.start()

        except Exception as e:
            self.status_label.setText("状态: 错误")
            self.result_text.setText(f"启动失败: {e}")
            self.is_recognizing = False

    def stop_recognition(self):
        # 禁用按钮，防止重复点击
        self.toggle_button.setEnabled(False)
        self.status_label.setText("状态: 正在停止...")

        if self.recognition_worker and self.recognition_worker.isRunning():
            self.recognition_worker.stop() # 发出停止信号，非阻塞
        else:
            # 如果worker不存在或未运行，直接清理
            self.on_worker_finished()
        
        # 音频捕获可以立即停止，因为它有自己的线程
        self.audio_capture.stop_capture()

    def append_result(self, text):
        self.result_text.append(text)
        self.result_text.verticalScrollBar().setValue(self.result_text.verticalScrollBar().maximum())

    def on_recognition_error(self, error_message):
        self.result_text.append(f"\n--- ERROR ---\n{error_message}\n---------------")
        self.stop_recognition()

    def on_worker_finished(self):
        # This is called when the worker thread has fully terminated
        print("工作线程已完成。")
        self.recognition_worker = None
        self.is_recognizing = False
        
        # 确保UI状态在worker结束后更新
        self.toggle_button.setText("开始识别")
        self.status_label.setText("状态: 已停止")
        self.source_combo.setEnabled(True)
        self.device_combo.setEnabled(True)
        self.toggle_button.setEnabled(True)


    def closeEvent(self, event):
        if self.is_recognizing and self.recognition_worker:
            print("正在关闭应用程序，停止识别线程...")
            self.stop_recognition()
            # 等待工作线程完全结束
            if self.recognition_worker.isRunning():
                self.recognition_worker.wait() 
        event.accept()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    main_win = MainWindow()
    main_win.show()
    sys.exit(app.exec_())