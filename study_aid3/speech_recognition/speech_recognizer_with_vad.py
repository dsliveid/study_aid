import collections
import os
import queue
import subprocess
import threading
import time

import numpy as np
import soundfile as sf
from opencc import OpenCC


class SpeechRecognizerWithVAD:
    """集成 VAD 的语音识别器，支持自动断句。"""

    def __init__(
        self,
        model_path,
        on_speech_recognized,
        sample_rate=16000,
        chunk_duration=0.1,
        silence_duration=1.0,
        speech_threshold=0.01,
        smoothing_factor=0.9,
        dynamic_threshold=True,
        dynamic_threshold_factor=1.5,
        preroll_duration=0.3,
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

        self.on_speech_recognized = on_speech_recognized
        self.sample_rate = sample_rate
        self.chunk_duration = chunk_duration
        self.chunk_size = int(self.sample_rate * self.chunk_duration)
        self.silence_duration = silence_duration
        self.speech_threshold = speech_threshold
        self.smoothing_factor = smoothing_factor
        self.dynamic_threshold = dynamic_threshold
        self.dynamic_threshold_factor = dynamic_threshold_factor
        self.preroll_duration = preroll_duration
        self.cc = OpenCC("t2s")

        self.audio_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.processing_thread = None
        self.recognition_threads = []
        self.recognition_lock = threading.Lock()
        self.is_speaking = False
        self.speech_frames = []
        self.vad_decision_buffer = collections.deque(maxlen=3)
        self.last_is_speech_status = None
        self.smoothed_energy = 0.0

        self.silence_threshold_frames = max(1, int(self.silence_duration / self.chunk_duration))
        self.preroll_frames = max(1, int(self.preroll_duration / self.chunk_duration))
        self.pre_speech_frames = collections.deque(maxlen=self.preroll_frames)

        self.current_state = "SILENCE"
        self.silent_frames_count = 0

        # 保留原有参数位，避免调用方依赖这些属性时报错。
        self.hangover = 0.9
        self.vad_threshold = 0.8
        self.vad_state = 0.0

    def start(self, audio_queue, sample_rate):
        """启动语音识别器。"""
        if self.processing_thread and self.processing_thread.is_alive():
            print("识别已在运行。")
            return

        self.audio_queue = audio_queue
        self.sample_rate = sample_rate
        self.stop_event.clear()
        self.is_speaking = False
        self.speech_frames.clear()
        self.pre_speech_frames.clear()
        self.vad_decision_buffer.clear()
        self.last_is_speech_status = None
        self.smoothed_energy = 0.0
        self.current_state = "SILENCE"
        self.silent_frames_count = 0

        self.processing_thread = threading.Thread(target=self._process_audio_queue, daemon=True)
        self.processing_thread.start()
        print("语音识别器已启动 (带 VAD 和自动断句)。")

    def stop(self):
        """停止语音识别器。"""
        if not self.processing_thread or not self.processing_thread.is_alive():
            return

        print("正在停止语音识别器...")
        self.stop_event.set()
        self.processing_thread.join(timeout=2)

        if self.speech_frames:
            print("处理剩余的语音片段...")
            self._trigger_recognition()

        self._join_recognition_threads(timeout=5)

        self.processing_thread = None
        print("语音识别器已停止。")

    def _calculate_energy(self, audio_chunk):
        """计算音频块 RMS 能量。"""
        audio_chunk = np.asarray(audio_chunk).reshape(-1)
        if audio_chunk.size == 0:
            return 0.0

        if audio_chunk.dtype != np.float32:
            original_dtype = audio_chunk.dtype
            audio_chunk = audio_chunk.astype(np.float32)
            if np.issubdtype(original_dtype, np.integer):
                audio_chunk = audio_chunk / 32768.0

        max_val = np.max(np.abs(audio_chunk))
        if max_val > 1.0:
            audio_chunk = audio_chunk / max_val

        return float(np.sqrt(np.mean(audio_chunk ** 2)))

    def _is_speech(self, frame):
        """判断当前音频帧是否为语音。"""
        energy = self._calculate_energy(frame)
        self.smoothed_energy = (
            self.smoothing_factor * self.smoothed_energy
            + (1 - self.smoothing_factor) * energy
        )

        is_speech = self.smoothed_energy > self.speech_threshold
        print(
            f"Smoothed Energy: {self.smoothed_energy:.6f}, "
            f"Threshold: {self.speech_threshold:.6f}, Frame Decision: {is_speech}"
        )
        return is_speech

    def _process_audio_frame(self, frame):
        """通过 VAD 状态机处理单帧音频。"""
        if frame is None:
            return

        frame = np.asarray(frame).reshape(-1)
        if frame.size == 0:
            return

        is_speech = self._is_speech(frame)

        if self.current_state == "SILENCE":
            if is_speech:
                self.current_state = "SPEECH"
                self.is_speaking = True
                self.silent_frames_count = 0
                print("VAD Status Change: SPEECH")

                # 把判定为语音之前保留的少量上下文一起送入识别，避免句首被切掉。
                if self.pre_speech_frames:
                    self.speech_frames.extend(self.pre_speech_frames)
                    self.pre_speech_frames.clear()
                self.speech_frames.append(frame)
            else:
                self.pre_speech_frames.append(frame)
            return

        self.speech_frames.append(frame)
        if is_speech:
            self.silent_frames_count = 0
            return

        self.silent_frames_count += 1
        if self.silent_frames_count >= self.silence_threshold_frames:
            self._finalize_speech_segment()

    def _process_audio_queue(self):
        """从音频队列中获取数据并处理，停止时继续消费剩余数据。"""
        while not self.stop_event.is_set() or not self.audio_queue.empty():
            try:
                data = self.audio_queue.get(timeout=0.1)
                self._process_audio_frame(data)
            except queue.Empty:
                continue

        if self.speech_frames:
            print("音频队列处理结束，准备识别剩余语音...")
            self._trigger_recognition()

    def _finalize_speech_segment(self):
        """结束当前语音段并提交识别。"""
        if not self.speech_frames:
            self.current_state = "SILENCE"
            self.is_speaking = False
            self.silent_frames_count = 0
            return

        speech_segment = np.concatenate(self.speech_frames)
        print(f"VAD: 检测到静音，准备识别... (累计 {len(self.speech_frames)} 帧)")

        self.speech_frames.clear()
        self.current_state = "SILENCE"
        self.is_speaking = False
        self.silent_frames_count = 0

        self._start_recognition_thread(speech_segment)

    def _trigger_recognition(self):
        """异步触发剩余缓存的识别。"""
        if not self.speech_frames:
            return

        audio_block = np.concatenate(self.speech_frames)
        self.speech_frames.clear()
        self.current_state = "SILENCE"
        self.is_speaking = False
        self.silent_frames_count = 0

        self._start_recognition_thread(audio_block)

    def _start_recognition_thread(self, audio_block):
        """启动后台识别线程，避免阻塞音频消费。"""
        worker = threading.Thread(
            target=self.recognize_audio_chunk,
            args=(audio_block,),
            daemon=True,
        )
        with self.recognition_lock:
            self.recognition_threads.append(worker)
        worker.start()

    def _join_recognition_threads(self, timeout=5):
        """停止前等待后台识别线程完成。"""
        deadline = time.time() + timeout
        while True:
            with self.recognition_lock:
                alive_threads = [t for t in self.recognition_threads if t.is_alive()]
                self.recognition_threads = alive_threads

            if not alive_threads:
                return

            remaining = deadline - time.time()
            if remaining <= 0:
                return

            alive_threads[0].join(timeout=min(0.2, remaining))

    def recognize_audio_chunk(self, audio_chunk):
        """使用 Whisper C++ 识别音频块。"""
        audio_chunk = np.asarray(audio_chunk).reshape(-1)
        if audio_chunk.size == 0 or not audio_chunk.any():
            return

        timestamp = int(time.time() * 1000)
        filename = f"audio_chunk_{timestamp}.wav"
        wav_path = os.path.join(self.temp_files_dir, filename)
        txt_path = wav_path + ".txt"

        try:
            if audio_chunk.dtype != np.int16:
                audio_chunk = audio_chunk.astype(np.float32)
                max_val = np.max(np.abs(audio_chunk))
                if max_val > 1.0:
                    audio_chunk = audio_chunk / max_val
                audio_chunk = np.clip(audio_chunk, -1.0, 1.0)
                audio_chunk = (audio_chunk * 32767).astype(np.int16)

            sf.write(wav_path, audio_chunk, self.sample_rate)

            command = [
                self.whisper_cpp_path,
                "-m",
                self.model_path,
                "-f",
                wav_path,
                "-t",
                "4",
                "-l",
                "zh",
                "-otxt",
            ]

            print(f"正在处理文件: {wav_path}")
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
                simplified_text = self.cc.convert(text_no_timestamp)

                if simplified_text.strip():
                    print(f"识别结果 (简体): {simplified_text}")
                    if self.on_speech_recognized:
                        self.on_speech_recognized(simplified_text)

        except Exception as e:
            print(f"识别音频块时发生错误: {e}")
        finally:
            current = threading.current_thread()
            with self.recognition_lock:
                self.recognition_threads = [t for t in self.recognition_threads if t is not current and t.is_alive()]
            for file_path in [wav_path, txt_path]:
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError as e:
                        print(f"删除临时文件失败: {e}")


if __name__ == "__main__":
    from audio_capture import AudioCapture

    def on_recognized(text):
        print(f"主程序收到识别结果: {text}")

    recognizer = SpeechRecognizerWithVAD(
        model_path="whisper_cpp/ggml-base.bin",
        on_speech_recognized=on_recognized,
        silence_duration=1.5,
        speech_threshold=0.02,
    )

    audio_capture = AudioCapture()

    try:
        devices = audio_capture.list_microphone_devices()
        if not devices:
            print("未找到麦克风设备。")
            raise SystemExit(1)

        print(f"使用设备: {devices[0]['name']}")
        audio_capture.start_microphone_capture(devices[0]["index"])
        recognizer.start(audio_capture.audio_queue, audio_capture.sample_rate)

        print("正在运行... 按 Ctrl+C 停止。")
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n收到停止信号...")
    except Exception as e:
        print(f"发生错误: {e}")
    finally:
        print("正在停止程序...")
        recognizer.stop()
        audio_capture.stop_capture()
        print("程序已停止。")
