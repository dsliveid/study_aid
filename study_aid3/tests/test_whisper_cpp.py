import unittest
import os
import subprocess
import time

class SpeechRecognitionTest(unittest.TestCase):
    def test_basic_transcription_whisper_cpp(self):
        """测试 whisper.cpp (main.exe) 的基本转录功能。"""
        # 1. 定义路径
        base_dir = os.path.dirname(os.path.dirname(__file__))
        exe_path = os.path.join(base_dir, 'whisper_cpp', 'main.exe')
        model_path = os.path.join(base_dir, 'whisper_cpp', 'ggml-base.en.bin')
        audio_path = os.path.join(base_dir, 'recorded_audio_16khz.wav')

        # 2. 检查文件是否存在
        self.assertTrue(os.path.exists(exe_path), f"Whisper.cpp 可执行文件不存在: {exe_path}")
        self.assertTrue(os.path.exists(model_path), f"模型文件不存在: {model_path}")
        self.assertTrue(os.path.exists(audio_path), f"音频文件不存在: {audio_path}")

        # 3. 执行转录命令
        command = [
            exe_path,
            "-m", model_path,
            "-f", audio_path,
            "-otxt"
        ]
        # 将 stdout 和 stderr 重定向到日志文件
        log_path = os.path.join(base_dir, "whisper_log.txt")
        with open(log_path, "w", encoding='utf-8') as log_file:
            process = subprocess.Popen(command, cwd=base_dir, stdout=log_file, stderr=subprocess.STDOUT)
            process.communicate()

        # 4. 读取输出文件
        # whisper.cpp 会自动生成与输入文件同名但扩展名为 .txt 的输出文件
        output_txt_path = f"{audio_path}.txt"
        self.assertTrue(os.path.exists(output_txt_path), f"输出的文本文件不存在: {output_txt_path}. Check whisper_log.txt for details.")

        with open(output_txt_path, 'r', encoding='utf-8') as f:
            result_text = f.read().strip()

        # 5. 验证转录结果
        self.assertTrue(len(result_text.strip()) > 0, "转录结果为空")
        
        # 6. 清理临时文件
        os.remove(output_txt_path)

if __name__ == '__main__':
    unittest.main()