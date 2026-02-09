import subprocess
import numpy as np
import threading
import queue
import os
import time
import soundfile as sf
from opencc import OpenCC
import collections

class SpeechRecognizerWithVAD:
    """
    集成了VAD功能的语音识别器，能够实现自动断句。
    """
    def __init__(self, model_path, on_speech_recognized, sample_rate=16000, chunk_duration=0.1, silence_duration=1.0, speech_threshold=0.01, smoothing_factor=0.9, dynamic_threshold=True, dynamic_threshold_factor=1.5):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
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
        self.cc = OpenCC('t2s')

        self.audio_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.processing_thread = None
        self.is_speaking = False
        self.silence_frames = 0
        self.speech_frames = []
        self.vad_decision_buffer = collections.deque(maxlen=3)
        self.last_is_speech_status = None
        self.smoothed_energy = 0.0
        self.silence_threshold_frames = int(self.silence_duration / self.chunk_duration)

        # VAD 状态机参数
        self.current_state = "SILENCE"
        self.silent_frames_count = 0
        self.silence_frames_needed = int(silence_duration / chunk_duration)
        
        # VAD 平滑参数
        self.hangover = 0.9
        self.vad_threshold = 0.8
        self.vad_state = 0.0


    def start(self, audio_queue, sample_rate):
        """启动语音识别器"""
        if self.processing_thread and self.processing_thread.is_alive():
            print("识别已在运行。")
            return

        self.audio_queue = audio_queue
        self.sample_rate = sample_rate
        self.stop_event.clear()
        self.is_speaking = False
        self.silence_frames = 0
        self.speech_frames.clear()
        self.vad_decision_buffer.clear()
        self.last_is_speech_status = None
        self.smoothed_energy = 0.0

        self.processing_thread = threading.Thread(target=self._process_audio_queue)
        self.processing_thread.start()
        print("语音识别器已启动 (带VAD和自动断句)。")

    def stop(self):
        """停止语音识别器"""
        if not self.processing_thread or not self.processing_thread.is_alive():
            return

        print("正在停止语音识别器...")
        self.stop_event.set()
        self.processing_thread.join(timeout=2)
        
        # 停止后，处理缓冲区中剩余的语音
        if self.is_speaking and self.speech_frames:
            print("处理剩余的语音片段...")
            self._trigger_recognition()

        self.processing_thread = None
        print("语音识别器已停止。")

    def _calculate_energy(self, audio_chunk):
        """计算音频块的能量（RMS）"""
        # Ensure data is float
        if audio_chunk.dtype != np.float32:
            audio_chunk = audio_chunk.astype(np.float32) / 32768.0
        
        # Ensure data is in range [-1.0, 1.0]
        max_val = np.max(np.abs(audio_chunk))
        if max_val > 1.0:
            audio_chunk = audio_chunk / max_val
            
        return np.sqrt(np.mean(audio_chunk**2))

    def _is_speech(self, frame):
        """
        Determines if the given audio frame contains speech.
        """
        energy = self._calculate_energy(frame)
        
        # 使用更平滑的能量计算
        self.smoothed_energy = self.smoothing_factor * self.smoothed_energy + (1 - self.smoothing_factor) * energy
        
        is_speech = self.smoothed_energy > self.speech_threshold
        
        print(f"Smoothed Energy: {self.smoothed_energy:.6f}, Threshold: {self.speech_threshold:.6f}, Frame Decision: {is_speech}")
        
        return is_speech

    def _process_audio_frame(self, frame):
        """
        Processes a single audio frame through the VAD logic.
        """
        is_speech = self._is_speech(frame)
        
        if self.current_state == "SILENCE" and is_speech:
            self.current_state = "SPEECH"
            print(f"VAD Status Change: SPEECH")
            self.silent_frames_count = 0
            self.speech_frames.append(frame)
        elif self.current_state == "SPEECH":
            self.speech_frames.append(frame)
            if not is_speech:
                self.silent_frames_count += 1
                if self.silent_frames_count >= self.silence_frames_needed:
                    self.current_state = "SILENCE"
                    print(f"VAD: 检测到静音，准备识别... (累积 {len(self.speech_frames)} 帧)")
                    speech_segment = np.concatenate(self.speech_frames)
                    self.speech_frames.clear()
                    self.silent_frames_count = 0
                    self.recognize_audio_chunk(speech_segment)
            else:
                self.silent_frames_count = 0

    def _process_audio_queue(self):
        """
        从音频队列中获取数据并处理。
        这是在单独的线程中运行的。
        """
        while not self.stop_event.is_set():
            try:
                data = self.audio_queue.get(timeout=0.1)
                self._process_audio_frame(data)
            except queue.Empty:
                if self.is_speaking:
                    frames_missed = int(0.1 / self.chunk_duration)
                    self.silence_frames += frames_missed
                    if self.silence_frames > self.silence_threshold_frames:
                        print(f"检测到停顿 (队列为空，静音帧数: {self.silence_frames})，准备识别...")
                        self._trigger_recognition()
                        self.is_speaking = False
                        self.silence_frames = 0
                continue

    def _trigger_recognition(self):
        """在一个新线程中触发语音识别"""
        if self.speech_frames:
            audio_block = np.concatenate(self.speech_frames)
            self.speech_frames.clear()
            
            threading.Thread(target=self.recognize_audio_chunk, args=(audio_block,)).start()

    def recognize_audio_chunk(self, audio_chunk):
        """
        使用Whisper C++识别音频块。
        """
        if not audio_chunk.any():
            return

        timestamp = int(time.time() * 1000)
        filename = f"audio_chunk_{timestamp}.wav"
        wav_path = os.path.join(self.temp_files_dir, filename)
        txt_path = wav_path + ".txt"

        try:
            # 确保音频数据是16-bit PCM格式
            if audio_chunk.dtype != np.int16:
                # 检查音频数据的范围，避免裁剪失真
                max_val = np.max(np.abs(audio_chunk))
                if max_val > 1.0:
                    audio_chunk = audio_chunk / max_val
                audio_chunk = (audio_chunk * 32767).astype(np.int16)

            sf.write(wav_path, audio_chunk, self.sample_rate)

            command = [
                self.whisper_cpp_path,
                "-m", self.model_path,
                "-f", wav_path,
                "-t", "4",  # 使用4个线程
                "-l", "zh",  # 明确指定中文
                "-otxt"  # 输出为纯文本
            ]

            print(f"正在处理文件: {wav_path}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )

            # 输出调试信息
            if result.stderr:
                print(f"Whisper.cpp stderr: {result.stderr.strip()}")

            recognized_text = result.stdout.strip()
            if recognized_text:
                # 移除时间戳
                text_no_timestamp = "".join(
                    line.split(']  ', 1)[-1] for line in recognized_text.splitlines()
                )
                simplified_text = self.cc.convert(text_no_timestamp)

                # 只输出有意义的文本
                if len(simplified_text.strip()) > 0:
                    print(f"识别结果 (简体): {simplified_text}")
                    if self.on_speech_recognized:
                        self.on_speech_recognized(simplified_text)

        except Exception as e:
            print(f"识别音频块时发生错误: {e}")
        finally:
            # 清理临时文件
            for file_path in [wav_path, txt_path]:
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError as e:
                        print(f"删除临时文件失败: {e}")


# 使用示例
if __name__ == "__main__":
    from audio_capture import AudioCapture

    # 定义一个简单的回调函数来打印识别结果
    def on_recognized(text):
        print(f"主程序收到识别结果: {text}")

    # 创建并配置识别器
    recognizer = SpeechRecognizerWithVAD(
        model_path="whisper_cpp/ggml-base.bin",
        on_speech_recognized=on_recognized,
        silence_duration=1.5,  # 1.5秒静音后断句
        speech_threshold=0.02
    )

    # 创建音频捕获实例
    audio_capture = AudioCapture()

    try:
        # 启动音频捕获（例如，从默认麦克风）
        # 注意：这里需要根据实际情况选择设备
        devices = audio_capture.list_microphone_devices()
        if not devices:
            print("未找到麦克风设备。")
            exit()
        
        print(f"使用设备: {devices[0]['name']}")
        audio_capture.start_microphone_capture(devices[0]['index'])

        # 启动识别器
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
        audio_capture.stop()
        print("程序已停止。")
