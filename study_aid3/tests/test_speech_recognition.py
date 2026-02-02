import unittest
from faster_whisper import WhisperModel
import os

class SpeechRecognitionTest(unittest.TestCase):
    """
    TC-SR-001: faster-whisper模型基本功能测试
    """
    def test_basic_transcription_faster_whisper(self):
        """
        测试faster-whisper模型的基本转录功能。
        """
        # 加载 "tiny" 模型
        model = WhisperModel("tiny", device="cpu", compute_type="int8")

        # 定义音频文件路径
        audio_path = os.path.join(os.path.dirname(__file__), '..', 'recorded_audio.wav')

        # 检查音频文件是否存在
        self.assertTrue(os.path.exists(audio_path), f"音频文件不存在: {audio_path}")

        # 转录音频
        segments, info = model.transcribe(audio_path, beam_size=5)
        
        # 从生成器中提取文本
        result_text = "".join(segment.text for segment in segments)

        # 验证转录结果
        expected_text = "Hello, world."
        # 比较时忽略大小写、标点和空格
        normalized_result = ''.join(filter(str.isalnum, result_text)).lower()
        normalized_expected = ''.join(filter(str.isalnum, expected_text)).lower()
        
        self.assertEqual(normalized_result, normalized_expected, f"转录结果与预期不符: 得到 '{result_text}', 预期 '{expected_text}'")

if __name__ == '__main__':
    unittest.main()