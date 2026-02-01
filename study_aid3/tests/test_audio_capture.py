"""
音频采集技术验证测试
测试音频采集功能的可行性与性能
"""

import sounddevice as sd
import numpy as np
import queue
import time
import json
from datetime import datetime
from typing import List, Dict, Optional


class AudioCaptureTest:
    """音频采集测试类"""

    def __init__(self):
        self.test_results = []
        self.start_time = datetime.now()

    def log_result(self, test_name: str, passed: bool, message: str, details: Dict = None):
        """记录测试结果"""
        result = {
            'test_name': test_name,
            'passed': passed,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)

        status = "✅ 通过" if passed else "❌ 失败"
        print(f"\n{status}: {test_name}")
        print(f"  消息: {message}")
        if details:
            for key, value in details.items():
                print(f"  {key}: {value}")

    def test_microphone_enumeration(self):
        """TC-AC-001: 麦克风设备枚举"""
        try:
            devices = sd.query_devices()
            microphones = []

            for i, device in enumerate(devices):
                if device['max_input_channels'] > 0:
                    microphones.append({
                        'index': i,
                        'name': device['name'],
                        'channels': device['max_input_channels'],
                        'sample_rate': device['default_samplerate']
                    })

            if len(microphones) == 0:
                self.log_result(
                    "TC-AC-001: 麦克风设备枚举",
                    False,
                    "未找到麦克风设备"
                )
                return False

            for mic in microphones:
                if 'index' not in mic or 'name' not in mic or 'channels' not in mic or 'sample_rate' not in mic:
                    self.log_result(
                        "TC-AC-001: 麦克风设备枚举",
                        False,
                        "设备信息不完整"
                    )
                    return False

            self.log_result(
                "TC-AC-001: 麦克风设备枚举",
                True,
                f"找到 {len(microphones)} 个麦克风设备",
                {'devices': microphones}
            )
            return microphones

        except Exception as e:
            self.log_result(
                "TC-AC-001: 麦克风设备枚举",
                False,
                f"异常: {str(e)}"
            )
            return False

    def test_system_audio_enumeration(self):
        """TC-AC-002: 系统音频设备枚举"""
        try:
            devices = sd.query_devices()
            output_devices = []

            for i, device in enumerate(devices):
                if device['max_output_channels'] > 0:
                    output_devices.append({
                        'index': i,
                        'name': device['name'],
                        'channels': device['max_output_channels'],
                        'sample_rate': device['default_samplerate']
                    })

            if len(output_devices) == 0:
                self.log_result(
                    "TC-AC-002: 系统音频设备枚举",
                    False,
                    "未找到音频输出设备"
                )
                return False

            for dev in output_devices:
                if 'index' not in dev or 'name' not in dev or 'channels' not in dev or 'sample_rate' not in dev:
                    self.log_result(
                        "TC-AC-002: 系统音频设备枚举",
                        False,
                        "设备信息不完整"
                    )
                    return False

            self.log_result(
                "TC-AC-002: 系统音频设备枚举",
                True,
                f"找到 {len(output_devices)} 个音频输出设备",
                {'devices': output_devices}
            )
            return output_devices

        except Exception as e:
            self.log_result(
                "TC-AC-002: 系统音频设备枚举",
                False,
                f"异常: {str(e)}"
            )
            return False

    def test_microphone_capture(self, device_index: Optional[int] = None, duration: int = 3):
        """TC-AC-003: 麦克风音频采集"""
        try:
            audio_queue = queue.Queue(maxsize=100)

            def callback(indata, frames, time_info, status):
                if status:
                    print(f"  音频回调状态: {status}")
                try:
                    audio_queue.put_nowait(indata.copy())
                except queue.Full:
                    pass

            stream = sd.InputStream(
                device=device_index,
                channels=1,
                samplerate=16000,
                callback=callback
            )

            stream.start()
            print(f"  开始采集麦克风音频 (设备: {device_index}, 时长: {duration}秒)")

            audio_chunks = []
            num_chunks = int(duration * 16000 / 1024)

            for i in range(num_chunks):
                audio_data = audio_queue.get(timeout=2.0)
                if audio_data is not None:
                    audio_chunks.append(audio_data)
                    if (i + 1) % 10 == 0:
                        print(f"  采集进度: {i+1}/{num_chunks}")

            stream.stop()
            stream.close()

            audio = np.concatenate(audio_chunks)

            if len(audio) == 0:
                self.log_result(
                    "TC-AC-003: 麦克风音频采集",
                    False,
                    "未采集到音频数据"
                )
                return False

            if audio.dtype != np.float32:
                self.log_result(
                    "TC-AC-003: 麦克风音频采集",
                    False,
                    f"音频数据类型不正确: {audio.dtype}"
                )
                return False

            self.log_result(
                "TC-AC-003: 麦克风音频采集",
                True,
                f"采集完成，音频长度: {len(audio)} 采样点",
                {
                    'duration': len(audio) / 16000,
                    'dtype': str(audio.dtype),
                    'shape': audio.shape
                }
            )
            return True

        except Exception as e:
            self.log_result(
                "TC-AC-003: 麦克风音频采集",
                False,
                f"异常: {str(e)}"
            )
            return False

    def test_different_sample_rates(self, device_index: Optional[int] = None, duration: int = 2):
        """TC-AC-004: 不同采样率采集"""
        try:
            sample_rates = [8000, 16000, 44100]
            results = {}

            for sample_rate in sample_rates:
                print(f"\n  测试采样率: {sample_rate} Hz")

                audio_queue = queue.Queue(maxsize=100)

                def callback(indata, frames, time_info, status):
                    if status:
                        print(f"  音频回调状态: {status}")
                    try:
                        audio_queue.put_nowait(indata.copy())
                    except queue.Full:
                        pass

                stream = sd.InputStream(
                    device=device_index,
                    channels=1,
                    samplerate=sample_rate,
                    callback=callback
                )

                stream.start()

                audio_chunks = []
                num_chunks = int(duration * sample_rate / 1024)

                for i in range(num_chunks):
                    audio_data = audio_queue.get(timeout=2.0)
                    if audio_data is not None:
                        audio_chunks.append(audio_data)

                stream.stop()
                stream.close()

                audio = np.concatenate(audio_chunks)

                expected_length = int(duration * sample_rate)
                if abs(len(audio) - expected_length) >= 100:
                    self.log_result(
                        "TC-AC-004: 不同采样率采集",
                        False,
                        f"采样率 {sample_rate} Hz: 音频长度不符合预期"
                    )
                    return False

                results[sample_rate] = {
                    'length': len(audio),
                    'expected': expected_length,
                    'dtype': str(audio.dtype)
                }
                print(f"  采样率 {sample_rate} Hz: 采集成功，音频长度: {len(audio)} 采样点")

            self.log_result(
                "TC-AC-004: 不同采样率采集",
                True,
                f"所有采样率测试通过",
                {'results': results}
            )
            return True

        except Exception as e:
            self.log_result(
                "TC-AC-004: 不同采样率采集",
                False,
                f"异常: {str(e)}"
            )
            return False

    def test_system_audio_capture(self, device_index: Optional[int] = None, duration: int = 3):
        """TC-AC-005: 系统音频Loopback采集"""
        try:
            audio_queue = queue.Queue(maxsize=100)

            def callback(indata, frames, time_info, status):
                if status:
                    print(f"  环回回调状态: {status}")
                try:
                    audio_queue.put_nowait(indata.copy())
                except queue.Full:
                    pass

            stream = sd.InputStream(
                device=device_index,
                channels=2,
                samplerate=44100,
                callback=callback
            )

            stream.start()
            print(f"  开始采集系统音频 (设备: {device_index}, 时长: {duration}秒)")
            print("  提示: 请播放测试音频...")

            audio_chunks = []
            num_chunks = int(duration * 44100 / 1024)

            for i in range(num_chunks):
                audio_data = audio_queue.get(timeout=2.0)
                if audio_data is not None:
                    audio_chunks.append(audio_data)
                    if (i + 1) % 10 == 0:
                        print(f"  采集进度: {i+1}/{num_chunks}")

            stream.stop()
            stream.close()

            audio = np.concatenate(audio_chunks)

            if len(audio) == 0:
                self.log_result(
                    "TC-AC-005: 系统音频Loopback采集",
                    False,
                    "未采集到音频数据"
                )
                return False

            if audio.shape[1] != 2:
                self.log_result(
                    "TC-AC-005: 系统音频Loopback采集",
                    False,
                    f"系统音频应该是立体声，实际: {audio.shape}"
                )
                return False

            self.log_result(
                "TC-AC-005: 系统音频Loopback采集",
                True,
                f"采集完成，音频长度: {len(audio)} 采样点",
                {
                    'duration': len(audio) / 44100,
                    'channels': audio.shape[1],
                    'shape': audio.shape
                }
            )
            return True

        except Exception as e:
            self.log_result(
                "TC-AC-005: 系统音频Loopback采集",
                False,
                f"异常: {str(e)}"
            )
            return False

    def test_audio_source_switch(self, mic_device_index: Optional[int] = None,
                               sys_device_index: Optional[int] = None,
                               duration: int = 2):
        """TC-AC-006: 音频源切换"""
        try:
            print("  === 测试音频源切换 ===")

            # 测试麦克风采集
            print("\n  1. 启动麦克风采集")
            audio_queue = queue.Queue(maxsize=100)

            def callback(indata, frames, time_info, status):
                if status:
                    print(f"  音频回调状态: {status}")
                try:
                    audio_queue.put_nowait(indata.copy())
                except queue.Full:
                    pass

            stream = sd.InputStream(
                device=mic_device_index,
                channels=1,
                samplerate=16000,
                callback=callback
            )

            stream.start()
            print(f"  正在采集麦克风音频...")

            audio_chunks = []
            num_chunks = int(duration * 16000 / 1024)

            for i in range(num_chunks):
                audio_data = audio_queue.get(timeout=2.0)
                if audio_data is not None:
                    audio_chunks.append(audio_data)

            stream.stop()
            stream.close()

            mic_audio = np.concatenate(audio_chunks)
            print(f"  麦克风采集完成，长度: {len(mic_audio)} 采样点")

            # 等待1秒
            time.sleep(1)

            # 测试系统音频采集
            print("\n  2. 启动系统音频采集")
            audio_queue = queue.Queue(maxsize=100)

            stream = sd.InputStream(
                device=sys_device_index,
                channels=2,
                samplerate=44100,
                callback=callback
            )

            stream.start()
            print(f"  正在采集系统音频...")

            audio_chunks = []
            num_chunks = int(duration * 44100 / 1024)

            for i in range(num_chunks):
                audio_data = audio_queue.get(timeout=2.0)
                if audio_data is not None:
                    audio_chunks.append(audio_data)

            stream.stop()
            stream.close()

            sys_audio = np.concatenate(audio_chunks)
            print(f"  系统音频采集完成，长度: {len(sys_audio)} 采样点")

            # 验证
            if len(mic_audio) == 0:
                self.log_result(
                    "TC-AC-006: 音频源切换",
                    False,
                    "麦克风采集失败"
                )
                return False

            if len(sys_audio) == 0:
                self.log_result(
                    "TC-AC-006: 音频源切换",
                    False,
                    "系统音频采集失败"
                )
                return False

            self.log_result(
                "TC-AC-006: 音频源切换",
                True,
                "音频源切换测试通过",
                {
                    'mic_audio_length': len(mic_audio),
                    'sys_audio_length': len(sys_audio)
                }
            )
            return True

        except Exception as e:
            self.log_result(
                "TC-AC-006: 音频源切换",
                False,
                f"异常: {str(e)}"
            )
            return False

    def generate_report(self):
        """生成测试报告"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['passed'])
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        report = {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'pass_rate': f"{pass_rate:.1f}%"
            },
            'start_time': self.start_time.isoformat(),
            'end_time': datetime.now().isoformat(),
            'results': self.test_results
        }

        # 保存到文件
        report_file = "audio_capture_test_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        # 打印摘要
        print("\n" + "="*60)
        print("测试报告摘要")
        print("="*60)
        print(f"总测试数: {total_tests}")
        print(f"通过: {passed_tests}")
        print(f"失败: {failed_tests}")
        print(f"通过率: {pass_rate:.1f}%")
        print(f"报告已保存到: {report_file}")
        print("="*60)

        return report


def main():
    """主函数"""
    print("="*60)
    print("音频采集技术验证测试")
    print("="*60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    tester = AudioCaptureTest()

    # TC-AC-001: 麦克风设备枚举
    print("\n" + "="*60)
    print("TC-AC-001: 麦克风设备枚举")
    print("="*60)
    microphones = tester.test_microphone_enumeration()

    # TC-AC-002: 系统音频设备枚举
    print("\n" + "="*60)
    print("TC-AC-002: 系统音频设备枚举")
    print("="*60)
    output_devices = tester.test_system_audio_enumeration()

    # TC-AC-003: 麦克风音频采集
    if microphones:
        print("\n" + "="*60)
        print("TC-AC-003: 麦克风音频采集")
        print("="*60)
        mic_device_index = microphones[0]['index']
        tester.test_microphone_capture(device_index=mic_device_index, duration=3)

    # TC-AC-004: 不同采样率采集
    if microphones:
        print("\n" + "="*60)
        print("TC-AC-004: 不同采样率采集")
        print("="*60)
        mic_device_index = microphones[0]['index']
        tester.test_different_sample_rates(device_index=mic_device_index, duration=2)

    # TC-AC-005: 系统音频Loopback采集
    if output_devices:
        print("\n" + "="*60)
        print("TC-AC-005: 系统音频Loopback采集")
        print("="*60)
        sys_device_index = output_devices[0]['index']
        print("注意: 系统音频采集可能需要管理员权限")
        tester.test_system_audio_capture(device_index=sys_device_index, duration=3)

    # TC-AC-006: 音频源切换
    if microphones and output_devices:
        print("\n" + "="*60)
        print("TC-AC-006: 音频源切换")
        print("="*60)
        mic_device_index = microphones[0]['index']
        sys_device_index = output_devices[0]['index']
        tester.test_audio_source_switch(
            mic_device_index=mic_device_index,
            sys_device_index=sys_device_index,
            duration=2
        )

    # 生成测试报告
    print("\n" + "="*60)
    print("生成测试报告")
    print("="*60)
    tester.generate_report()

    print(f"\n结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)


if __name__ == "__main__":
    main()
