import os
import queue
import subprocess
import threading
import time

import numpy as np
import soundfile as sf
from opencc import OpenCC


class SpeechRecognizer:
    def __init__(
        self,
        model_path="whisper_cpp/ggml-base.bin",
        keep_temp_files=False,
        buffer_duration_seconds=5.0,
        whisper_threads=2,
        max_pending_chunks=2,
    ):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.model_path = os.path.join(project_root, model_path)
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
        self.recognition_thread = None
        self.keep_temp_files = keep_temp_files
        self.audio_buffer = []
        self.buffered_frames = 0
        self.buffer_duration_seconds = buffer_duration_seconds
        self.whisper_threads = max(1, int(whisper_threads))
        self.recognition_queue = queue.Queue(maxsize=max_pending_chunks)
        self.cc = OpenCC("t2s")
        self.last_backpressure_log_time = 0.0

    def start(self, audio_queue, sample_rate):
        if self.processing_thread and self.processing_thread.is_alive():
            print("识别已在运行。")
            return

        self.audio_queue = audio_queue
        self.sample_rate = sample_rate
        self.stop_event.clear()
        self.audio_buffer = []
        self.buffered_frames = 0
        self.last_backpressure_log_time = 0.0
        self._clear_queue(self.result_queue)
        self._clear_queue(self.recognition_queue)

        self.recognition_thread = threading.Thread(target=self._process_recognition_queue, daemon=True)
        self.processing_thread = threading.Thread(target=self._process_audio_queue, daemon=True)
        self.recognition_thread.start()
        self.processing_thread.start()
        print("语音识别器已启动 (非流式模式)。")

    def stop(self):
        if not self.processing_thread or not self.processing_thread.is_alive():
            return

        print("正在停止语音识别器...")
        self.stop_event.set()
        self.processing_thread.join(timeout=3)
        if self.recognition_thread:
            self.recognition_thread.join(timeout=5)

        self.processing_thread = None
        self.recognition_thread = None

        if self.audio_queue:
            self._clear_queue(self.audio_queue)

        print("语音识别器已停止。")

    def get_result(self, timeout=1):
        try:
            return self.result_queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def _clear_queue(self, target_queue):
        while not target_queue.empty():
            try:
                target_queue.get_nowait()
            except queue.Empty:
                break

    def _enqueue_recognition(self, audio_block):
        """Keep recognition serialized and merge backlog under load."""
        if audio_block is None or len(audio_block) == 0:
            return

        while not self.stop_event.is_set():
            try:
                self.recognition_queue.put_nowait(audio_block)
                return
            except queue.Full:
                try:
                    pending = self.recognition_queue.get_nowait()
                    audio_block = np.concatenate((pending, audio_block))
                    now = time.time()
                    if now - self.last_backpressure_log_time >= 5:
                        pending_seconds = len(audio_block) / float(self.sample_rate)
                        print(f"识别队列积压，已合并待识别音频，当前待处理约 {pending_seconds:.1f} 秒。")
                        self.last_backpressure_log_time = now
                except queue.Empty:
                    return

    def _process_audio_queue(self):
        buffer_size_frames = int(self.buffer_duration_seconds * self.sample_rate)

        while not self.stop_event.is_set() or not self.audio_queue.empty():
            try:
                chunk = self.audio_queue.get(timeout=0.1)
                if chunk is None:
                    continue

                chunk = np.asarray(chunk).reshape(-1)
                if chunk.size == 0:
                    continue

                self.audio_buffer.append(chunk)
                self.buffered_frames += len(chunk)

                if self.buffered_frames >= buffer_size_frames:
                    audio_block = np.concatenate(self.audio_buffer)
                    self.audio_buffer = []
                    self.buffered_frames = 0
                    self._enqueue_recognition(audio_block)

            except queue.Empty:
                continue
            except Exception as e:
                print(f"处理音频队列时发生错误: {e}")

        if self.audio_buffer:
            audio_block = np.concatenate(self.audio_buffer)
            self.audio_buffer = []
            self.buffered_frames = 0
            self._enqueue_recognition(audio_block)

        print("音频处理线程已结束。")

    def _process_recognition_queue(self):
        while not self.stop_event.is_set() or not self.recognition_queue.empty():
            try:
                audio_block = self.recognition_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            try:
                self.recognize_audio_chunk(audio_block)
            except Exception as e:
                print(f"后台识别线程发生错误: {e}")

        print("识别处理线程已结束。")

    def recognize_audio_chunk(self, audio_chunk):
        audio_chunk = np.asarray(audio_chunk).reshape(-1)
        if audio_chunk.size == 0 or not audio_chunk.any():
            return

        timestamp = int(time.time() * 1000)
        filename = f"audio_chunk_{timestamp}.wav"
        filepath = os.path.join(self.temp_files_dir, filename)

        try:
            if audio_chunk.dtype != np.int16:
                audio_chunk = audio_chunk.astype(np.float32)
                max_val = np.max(np.abs(audio_chunk))
                if max_val > 1.0:
                    audio_chunk = audio_chunk / max_val
                audio_chunk = np.clip(audio_chunk, -1.0, 1.0)
                audio_chunk = (audio_chunk * 32767).astype(np.int16)

            sf.write(filepath, audio_chunk, self.sample_rate)

            command = [
                self.whisper_cpp_path,
                "-m",
                self.model_path,
                "-f",
                filepath,
                "-t",
                str(self.whisper_threads),
                "-l",
                "zh",
                "-otxt",
            ]

            print(f"正在处理文件: {filepath}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )

            if result.stderr:
                print(f"Whisper.cpp stderr: {result.stderr.strip()}")

            recognized_text = result.stdout.strip()
            if recognized_text:
                text_no_timestamp = "".join(
                    line.split("]  ", 1)[-1] for line in recognized_text.splitlines()
                )
                simplified_text = self.cc.convert(text_no_timestamp).strip()
                if simplified_text:
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
