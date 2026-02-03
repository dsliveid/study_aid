import unittest
import os
import subprocess
import sounddevice as sd
import numpy as np
import queue
from scipy.io.wavfile import write

class TestIntegration(unittest.TestCase):
    def test_end_to_end(self):
        """TC-INT-001: 完整流程测试"""
        print("=== 端到端流程测试 ===")

        # --- 步骤1: 音频采集 ---
        print("步骤1: 音频采集")
        duration = 5
        sample_rate = 16000
        audio_queue = queue.Queue()

        def callback(indata, frames, time, status):
            if status:
                print(f"音频回调状态: {status}")
            audio_queue.put(indata.copy())

        try:
            with sd.InputStream(samplerate=sample_rate, channels=1, callback=callback):
                print(f"  请在 {duration} 秒内说话...")
                audio_chunks = []
                for _ in range(int(duration * sample_rate / 1024)):
                    audio_chunks.append(audio_queue.get(timeout=2))
                print("  采集完成。")
        except Exception as e:
            self.fail(f"音频采集失败: {e}")

        audio = np.concatenate(audio_chunks, axis=0)
        self.assertTrue(len(audio) > 0, "未采集到音频数据")

        # 将 float32 转换为 int16
        audio_int16 = (audio * 32767).astype(np.int16)

        # --- 步骤2: 保存到文件 ---
        print("步骤2: 保存到文件")
        base_dir = os.path.dirname(os.path.dirname(__file__))
        audio_path = os.path.join(base_dir, "tests", "temp_recorded_audio.wav")
        write(audio_path, sample_rate, audio_int16)
        print(f"  音频已保存到: {audio_path}")
        self.assertTrue(os.path.exists(audio_path), "保存音频文件失败")

        # --- 步骤3: 语音识别 (whisper.cpp) ---
        print("步骤3: 语音识别 (whisper.cpp)")
        exe_path = os.path.join(base_dir, 'whisper_cpp', 'main.exe')
        model_path = os.path.join(base_dir, 'whisper_cpp', 'ggml-base.en.bin')
        
        command = [
            exe_path,
            "-m", model_path,
            "-f", audio_path,
            "-otxt"
        ]
        log_path = os.path.join(base_dir, "whisper_log.txt")
        with open(log_path, "a", encoding='utf-8') as log_file:
            process = subprocess.Popen(command, cwd=base_dir, stdout=log_file, stderr=subprocess.STDOUT)
            process.communicate()

        if process.returncode != 0:
            print(f"  Whisper.cpp 执行可能失败 (返回码: {process.returncode})，请检查日志: {log_path}")

        print("\n端到端流程测试通过")

        # --- 步骤4: 读取结果 ---
        print("步骤4: 读取结果")
        output_txt_path = audio_path + ".txt"
        self.assertTrue(os.path.exists(output_txt_path), f"输出的文本文件不存在: {output_txt_path}")

        with open(output_txt_path, 'r', encoding='utf-8') as f:
            result_text = f.read().strip()
        
        # --- 步骤5: 输出结果和清理 ---
        print("步骤5: 输出结果和清理")
        print(f"  识别结果: {result_text}")

        os.remove(audio_path)
        os.remove(output_txt_path)
        print("  临时文件已清理。")

        self.assertTrue(len(result_text) > 0, "语音识别失败，未生成任何文本")
        print("\n端到端流程测试通过")

if __name__ == '__main__':
    unittest.main()