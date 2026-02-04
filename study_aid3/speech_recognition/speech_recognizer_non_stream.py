import subprocess
import numpy as np
import threading
import queue
import os
import time
import soundfile as sf
from opencc import OpenCC

class SpeechRecognizer:
    def __init__(self, model_path="whisper_cpp/ggml-base.bin", keep_temp_files=False):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        self.model_path = os.path.join(project_root, model_path)
        # 使用 main.exe
        self.whisper_cpp_path = os.path.join(project_root, "whisper_cpp", "main.exe")
        self.temp_files_dir = os.path.join(project_root, "temp_files")

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"模型文件未找到: {self.model_path}")
        if not os.path.exists(self.whisper_cpp_path):
            raise FileNotFoundError(f"whisper.cpp main 可执行文件未找到: {self.whisper_cpp_path}")
        
        if not os.path.exists(self.temp_files_dir):
            os.makedirs(self.temp_files_dir)

        self.audio_queue = None
        self.sample_rate = None
        self.result_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.processing_thread = None
        self.keep_temp_files = keep_temp_files
        self.audio_buffer = []
        self.buffer_duration_seconds = 5.0 # 每5秒处理一次
        self.cc = OpenCC('t2s')  # 创建一个繁体到简体的转换器

    def start(self, audio_queue, sample_rate):
        if self.processing_thread and self.processing_thread.is_alive():
            print("识别已在运行。")
            return

        self.audio_queue = audio_queue
        self.sample_rate = sample_rate
        self.stop_event.clear()
        self.audio_buffer = []

        self.processing_thread = threading.Thread(target=self._process_audio_queue)
        self.processing_thread.start()
        print("语音识别器已启动 (非流式模式)。")

    def stop(self):
        if not self.processing_thread or not self.processing_thread.is_alive():
            return
            
        print("正在停止语音识别器...")
        self.stop_event.set()
        self.processing_thread.join(timeout=2)

        self.processing_thread = None
        
        # 清空队列
        if self.audio_queue:
            while not self.audio_queue.empty():
                try:
                    self.audio_queue.get_nowait()
                except queue.Empty:
                    break
        
        print("语音识别器已停止。")

    def get_result(self, timeout=1):
        try:
            return self.result_queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def _process_audio_queue(self):
        buffer_size_frames = int(self.buffer_duration_seconds * self.sample_rate)
        
        while not self.stop_event.is_set():
            try:
                chunk = self.audio_queue.get(timeout=0.1)
                if chunk is None:
                    continue
                self.audio_buffer.append(chunk)

                current_frames = sum(len(c) for c in self.audio_buffer)
                if current_frames >= buffer_size_frames:
                    # 拼接音频块
                    audio_block = np.concatenate(self.audio_buffer)
                    self.audio_buffer = []
                    
                    # 在新线程中处理识别，避免阻塞音频队列
                    threading.Thread(target=self.recognize_audio_chunk, args=(audio_block,)).start()

            except queue.Empty:
                continue
            except Exception as e:
                print(f"处理音频队列时发生错误: {e}")
        
        # 处理剩余的音频
        if self.audio_buffer:
            audio_block = np.concatenate(self.audio_buffer)
            self.recognize_audio_chunk(audio_block)
        
        print("音频处理线程已结束。")

    def recognize_audio_chunk(self, audio_chunk):
        timestamp = int(time.time())
        filename = f"audio_chunk_{timestamp}.wav"
        filepath = os.path.join(self.temp_files_dir, filename)

        try:
            # 保存为 WAV 文件
            sf.write(filepath, audio_chunk, self.sample_rate)

            command = [
                self.whisper_cpp_path,
                "-m", self.model_path,
                "-f", filepath,
                "-t", "4", # 使用4个线程
                "-l", "zh", # 明确指定中文
                "-otxt" # 输出为纯文本
            ]
            
            print(f"正在处理文件: {filepath}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            
            # 始终打印 stdout 和 stderr 以便调试
            if result.stdout:
                print(f"Whisper.cpp stdout: {result.stdout.strip()}")
            if result.stderr:
                print(f"Whisper.cpp stderr: {result.stderr.strip()}")

            recognized_text = result.stdout.strip()
            if recognized_text:
                # 移除时间戳，例如 "[00:00:00.000 --> 00:00:05.080]  "
                text_no_timestamp = "".join(line.split(']  ', 1)[-1] for line in recognized_text.splitlines())
                simplified_text = self.cc.convert(text_no_timestamp)
                print(f"识别结果 (简体): {simplified_text}")
                self.result_queue.put(simplified_text)

        except Exception as e:
            print(f"识别音频块时发生错误: {e}")
        finally:
            if not self.keep_temp_files and os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError as e:
                    print(f"删除临时文件失败: {e}")