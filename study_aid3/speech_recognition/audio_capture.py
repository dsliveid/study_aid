import pyaudiowpatch as pyaudio
import sounddevice as sd
import numpy as np
from typing import Optional, Callable
import queue
import threading
import librosa


class AudioCapture:
    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels
        self.audio_queue = queue.Queue(maxsize=100)
        self.stop_event = threading.Event()
        self.capture_thread = None
        self.stream = None
        self.is_capturing = False
        self.pyaudio_instance = None
        self.pyaudio_stream = None
        self.sd_stream = None
        self.capture_started_event = threading.Event()
        self.capture_sample_rate = None

    def list_microphone_devices(self) -> list:
        """列出所有麦克风设备"""
        devices = sd.query_devices()
        mic_devices = []
        for i, device in enumerate(devices):
            if device['max_input_channels'] > 0:
                mic_devices.append({
                    'index': i,
                    'name': device['name'],
                    'channels': device['max_input_channels']
                })
        return mic_devices

    def list_system_audio_devices(self) -> list:
        """列出所有系统音频输出设备 (用于loopback)"""
        with pyaudio.PyAudio() as p:
            wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
            default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

            loopback_devices = []
            with pyaudio.PyAudio() as p:
                try:
                    wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
                except OSError:
                    print("系统不支持 WASAPI，无法捕获系统音频。")
                    return []

                for loopback in p.get_loopback_device_info_generator():
                    loopback_devices.append({
                        'index': loopback['index'],
                        'name': loopback['name'],
                        'channels': loopback['maxInputChannels'],
                        'sample_rate': int(loopback['defaultSampleRate'])
                    })
            return loopback_devices

    def start_microphone_capture(self, device_index: int) -> int:
        """开始麦克风采集"""
        self.stop_event.clear()
        self.capture_thread = threading.Thread(target=self._capture_microphone, args=(device_index,))
        self.capture_thread.start()
        # For microphone, we assume the requested sample rate is used.
        return self.sample_rate

    def start_system_audio_capture(self, device_index: int):
        """开始系统音频采集"""
        self.stop_capture()  # Stop any previous capture first
        self.stop_event.clear()
        self.capture_started_event.clear()
        self.capture_thread = threading.Thread(target=self._capture_system_audio, args=(device_index,))
        self.capture_thread.start()
        
        # 等待捕获线程成功启动并设置采样率
        started = self.capture_started_event.wait(timeout=5)
        if not started:
            print("错误: 音频捕获线程启动超时。")
            self.stop_capture()
            return None
        return self.capture_sample_rate

    def _capture_microphone(self, device_index: Optional[int]):
        """麦克风捕获线程的目标函数。"""
        try:
            def callback(indata, frames, time, status):
                if status:
                    print(f"Audio callback status: {status}")
                if not self.stop_event.is_set():
                    self.audio_queue.put(indata.copy())

            self.sd_stream = sd.InputStream(
                device=device_index,
                channels=self.channels,
                samplerate=self.sample_rate,
                callback=callback
            )
            self.sd_stream.start()
            self.is_capturing = True
            self.capture_started_event.set() # Signal that capture has started
            print("麦克风捕获已开始。")
            self.stop_event.wait() # Wait until stop is called

        except Exception as e:
            print(f"麦克风捕获错误: {e}")
            self.capture_started_event.set() # Ensure main thread is not blocked
        finally:
            if self.sd_stream:
                self.sd_stream.stop()
                self.sd_stream.close()
            print("麦克风捕获线程已结束。")


    def _capture_system_audio(self, device_index: int):
        """系统音频捕获线程的目标函数。"""
        try:
            self.pyaudio_instance = pyaudio.PyAudio()
            
            device_info = self.pyaudio_instance.get_device_info_by_index(device_index)
            channels = device_info['maxInputChannels']
            original_sample_rate = int(device_info['defaultSampleRate'])

            print(f"开始使用设备进行loopback捕获: {device_info['name']}")

            def callback(in_data, frame_count, time_info, status):
                if status:
                    print(f"系统音频捕获状态: {status}")
                try:
                    audio_data_int16 = np.frombuffer(in_data, dtype=np.int16)
                    
                    # 1. 将音频数据转换为浮点数 [-1.0, 1.0]
                    audio_data_float = audio_data_int16.astype(np.float32) / 32768.0

                    # 2. 根据声道数重塑数组
                    num_channels = channels
                    if num_channels > 1:
                        # 将一维数组重塑为 (帧数, 声道数)
                        reshaped_audio = audio_data_float.reshape(-1, num_channels)
                        # 3. 转换为单声道 (取平均值)
                        mono_audio = reshaped_audio.mean(axis=1)
                    else:
                        mono_audio = audio_data_float

                    # 4. 如果需要，进行重采样
                    if original_sample_rate != self.sample_rate:
                        # 使用 librosa.resample 进行高质量的重采样。
                        # librosa 默认会使用 soxr 库（如果已安装），并选择 'soxr_hq' (High Quality) 模式。
                        # 这提供了非常高的转换精度，但计算成本也最高。
                        resampled_audio = librosa.resample(
                            y=mono_audio, 
                            orig_sr=original_sample_rate, 
                            target_sr=self.sample_rate
                        )
                        # --- 性能优化考量 ---
                        # 在需要极低延迟的流式应用中，如果CPU成为瓶颈，可以牺牲少量精度以换取速度。
                        # 例如，使用 'kaiser_fast' 或 'soxr_mq'。
                        # 对于当前的非流式应用，'soxr_hq' 是最佳选择。
                        # 
                        # resampled_audio = librosa.resample(
                        #     y=mono_audio, 
                        #     orig_sr=original_sample_rate, 
                        #     target_sr=self.sample_rate,
                        #     res_type='kaiser_fast'  # 或者 'soxr_mq'
                        # )
                    else:
                        resampled_audio = mono_audio

                    self.audio_queue.put_nowait(resampled_audio)
                except queue.Full:
                    pass
                except Exception as e:
                    print(f"音频处理回调错误: {e}")
                return (in_data, pyaudio.paContinue)

            self.pyaudio_stream = self.pyaudio_instance.open(
                format=pyaudio.paInt16,
                channels=channels,
                rate=original_sample_rate,
                input=True,
                input_device_index=device_index,
                stream_callback=callback
            )
            
            self.pyaudio_stream.start_stream()
            self.is_capturing = True
            self.capture_sample_rate = self.sample_rate # 队列中的数据现在总是目标采样率
            self.capture_started_event.set()
            print(f"系统音频捕获已开始，原始采样率: {original_sample_rate}, 目标采样率: {self.sample_rate}, 通道数: {channels}")
            
            self.stop_event.wait()

        except Exception as e:
            print(f"系统音频捕获错误: {e}")
            self.capture_started_event.set()
        finally:
            # Cleanup is handled by stop_capture, just log thread exit
            print("系统音频捕获线程已结束。")


    def stop_capture(self):
        """停止所有类型的音频捕获。"""
        if self.stop_event.is_set():
            return # Already stopping

        self.stop_event.set()

        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=3)
            if self.capture_thread.is_alive():
                print("警告: 音频捕获线程未能正常停止。")
        self.capture_thread = None

        if self.pyaudio_stream:
            try:
                if self.pyaudio_stream.is_active():
                    self.pyaudio_stream.stop_stream()
                self.pyaudio_stream.close()
                print("PyAudio 音频流已停止。")
            except Exception as e:
                print(f"停止 PyAudio 音频流时出错: {e}")
            self.pyaudio_stream = None

        if self.pyaudio_instance:
            try:
                self.pyaudio_instance.terminate()
                print("PyAudio 实例已终止。")
            except Exception as e:
                print(f"终止 PyAudio 实例时出错: {e}")
            self.pyaudio_instance = None
        
        if self.sd_stream:
            try:
                self.sd_stream.stop()
                self.sd_stream.close()
                print("Sounddevice 音频流已停止。")
            except Exception as e:
                print(f"停止 Sounddevice 音频流时出错: {e}")
            self.sd_stream = None

        while not self.audio_queue.empty():
            try:
                self.audio_queue.get_nowait()
            except queue.Empty:
                break
        
        self.is_capturing = False
        print("音频捕获已完全停止。")

    def get_audio_data(self, timeout=1.0) -> Optional[np.ndarray]:
        """从队列中获取一个音频块。"""
        try:
            return self.audio_queue.get(timeout=timeout)
        except queue.Empty:
            return None