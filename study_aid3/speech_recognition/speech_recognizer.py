import subprocess
import numpy as np
import threading
import queue
import os
import time

class SpeechRecognizer:
    def __init__(self, model_path="whisper_cpp/ggml-base.en.bin", keep_temp_files=False):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        self.model_path = os.path.join(project_root, model_path)
        # 使用 stream.exe
        self.whisper_cpp_path = os.path.join(project_root, "whisper_cpp", "stream", "stream.exe")
        
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"模型文件未找到: {self.model_path}")
        if not os.path.exists(self.whisper_cpp_path):
            raise FileNotFoundError(f"whisper.cpp stream 可执行文件未找到: {self.whisper_cpp_path}")

        self.audio_queue = None
        self.sample_rate = None
        self.result_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.whisper_process = None
        self.audio_writer_thread = None
        self.result_reader_thread = None
        self.keep_temp_files = keep_temp_files # 虽然流式模式不生成文件，但保留此参数以保持接口一致性

    def start(self, audio_queue, sample_rate):
        if self.whisper_process:
            print("识别已在运行。")
            return

        self.audio_queue = audio_queue
        self.sample_rate = sample_rate
        self.stop_event.clear()

        command = [
            self.whisper_cpp_path,
            "-m", self.model_path,
            "-t", "4", # 使用4个线程
            "--step", "500", # 每500ms处理一次
            "--length", "5000", # 音频上下文长度为5000ms
        ]
        
        print(f"启动 Whisper.cpp stream: {' '.join(command)}")
        
        try:
            self.whisper_process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW # 在Windows上不创建控制台窗口
            )

            self.audio_writer_thread = threading.Thread(target=self._write_audio_to_stdin)
            self.result_reader_thread = threading.Thread(target=self._read_results_from_stdout)
            
            self.audio_writer_thread.start()
            self.result_reader_thread.start()
            
            print("语音识别器已启动 (流式模式)。")
        except Exception as e:
            print(f"启动 whisper stream 失败: {e}")


    def stop(self):
        if not self.whisper_process:
            return
            
        print("正在停止语音识别器...")
        self.stop_event.set()

        # 尝试优雅地关闭stdin
        if self.whisper_process and self.whisper_process.stdin:
            try:
                if not self.whisper_process.stdin.closed:
                    self.whisper_process.stdin.close()
            except (IOError, BrokenPipeError):
                pass # 进程可能已经关闭

        # 等待线程结束
        if self.audio_writer_thread:
            self.audio_writer_thread.join(timeout=1)
        if self.result_reader_thread:
            self.result_reader_thread.join(timeout=1)

        # 强制终止进程
        if self.whisper_process and self.whisper_process.poll() is None:
            print("强制终止 Whisper.cpp 进程...")
            try:
                self.whisper_process.kill()
                self.whisper_process.wait(timeout=1)
            except (subprocess.TimeoutExpired, ProcessLookupError):
                pass # 进程可能已经消失

        self.whisper_process = None
        self.audio_writer_thread = None
        self.result_reader_thread = None
        
        # 清空队列
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

    def _write_audio_to_stdin(self):
        while not self.stop_event.is_set():
            try:
                chunk = self.audio_queue.get(timeout=0.1)
                if chunk is None:
                    break
                
                # whisper.cpp stream 需要 16-bit PCM 数据
                if chunk.dtype != np.int16:
                    chunk = (chunk * 32767).astype(np.int16)
                
                self.whisper_process.stdin.write(chunk.tobytes())
                self.whisper_process.stdin.flush()

            except queue.Empty:
                continue
            except (IOError, BrokenPipeError) as e:
                print(f"写入音频到 whisper stream 失败: {e}")
                break
            except Exception as e:
                print(f"处理音频队列时发生未知错误: {e}")
                break
        print("音频写入线程已结束。")

    def _read_results_from_stdout(self):
        while not self.stop_event.is_set():
            try:
                # stream.exe 的输出格式是 "[...ms -> ...ms]  ...text..."
                output = self.whisper_process.stdout.readline().decode('utf-8', errors='ignore').strip()
                if output:
                    # 简单的解析，只提取文本部分
                    if "]" in output:
                        text = output.split("]", 1)[-1].strip()
                        if text and text != "[...]" and text != "(...)" :
                            print(f"识别结果: {text}")
                            self.result_queue.put(text)
                elif self.whisper_process.poll() is not None:
                    # 进程已结束
                    break
            except (IOError, ValueError) as e:
                print(f"从 whisper stream 读取结果失败: {e}")
                break
            except Exception as e:
                print(f"读取识别结果时发生未知错误: {e}")
                break
        
        # 读取 stderr 中的任何错误信息
        if self.whisper_process and self.whisper_process.stderr:
            stderr_output = self.whisper_process.stderr.read().decode('utf-8', errors='ignore')
            if stderr_output:
                print(f"Whisper Stream Stderr: {stderr_output.strip()}")

        print("结果读取线程已结束。")