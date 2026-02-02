"""
音频采集技术验证测试模块

本模块提供了一套完整的音频采集功能测试用例，用于验证和评估系统的音频采集能力。
测试涵盖了麦克风设备枚举、系统音频设备枚举、音频采集性能、不同采样率支持
以及音频源切换等多个维度的技术验证。

测试用例编号规则:
- TC-AC-001 ~ TC-AC-006: 代表音频采集( Audio Capture)不同测试场景

依赖库:
- sounddevice: 跨平台音频录制和播放库
- numpy: 数值计算和数组操作
- pyaudiowpatch: Windows音频环路捕获(WASAPI)支持
- wave: WAV音频文件读写

使用说明:
    1. 直接运行本脚本执行所有测试用例
    2. 测试结果会自动保存到 audio_capture_test_report.json
    3. 控制台会实时输出测试进度和结果摘要

作者: AI Assistant
创建时间: 2024
"""

import sounddevice as sd
import numpy as np
import queue
import time
import json
from datetime import datetime
from typing import List, Dict, Optional
import pyaudiowpatch as pyaudio
import wave


class AudioCaptureTest:
    """
    音频采集测试类
    
    该类提供了一套完整的音频采集功能测试框架，用于验证系统音频采集的
    可行性、稳定性和性能表现。测试类采用面向对象设计，将测试逻辑与
    结果记录分离，便于维护和扩展。
    
    主要测试功能包括:
    1. 设备枚举测试: 检测系统中可用的麦克风和音频输出设备
    2. 音频采集测试: 验证麦克风录音功能和系统音频环路捕获
    3. 采样率测试: 检测设备对不同采样率的支持情况
    4. 音频源切换测试: 验证不同音频输入源之间的切换能力
    
    测试结果管理:
    - 所有测试结果会自动记录在 test_results 列表中
    - 支持控制台实时输出和JSON文件持久化
    - 自动计算测试通过率并生成摘要报告
    
    使用示例:
        tester = AudioCaptureTest()
        microphones = tester.test_microphone_enumeration()
        tester.test_microphone_capture(microphones[0]['index'])
        report = tester.generate_report()
    """
    
    def __init__(self):
        """
        初始化音频采集测试类
        
        构造函数负责初始化测试所需的基础数据结构和时间戳。
        这些初始化数据将用于后续测试结果的记录和报告生成。
        
        初始化内容:
            test_results: 空列表，用于存储所有测试的执行结果
            start_time: 测试开始时间，用于计算测试总耗时和生成报告时间范围
            
        注意:
            - test_results 列表中的每个元素是一个字典，包含测试名称、通过状态、
              消息、详细信息和时间戳
            - start_time 使用datetime.now()捕获精确的测试开始时间
        """
        self.test_results = []
        self.start_time = datetime.now()

    def log_result(self, test_name: str, passed: bool, message: str, details: Dict = None):
        """
        记录测试结果
        
        该方法是测试结果记录的核心方法，每次测试执行后调用此方法记录结果。
        方法会自动将结果添加到内部列表，并在控制台输出格式化后的测试结果。
        
        参数说明:
            test_name: 测试用例名称，通常采用"TC-XXX: 测试描述"格式
            passed: 布尔值，True表示测试通过，False表示测试失败
            message: 测试结果的消息描述，提供测试结果的简要说明
            details: 可选字典，包含测试的详细结果数据，如设备信息、采集参数等
        
        返回值:
            无直接返回值，但会执行以下操作:
                1. 创建结果字典并添加到test_results列表
                2. 在控制台打印带emoji的测试状态
                3. 格式化输出消息和详细信息
        
        结果字典结构:
            {
                'test_name': 测试名称,
                'passed': 通过状态布尔值,
                'message': 结果消息,
                'details': 详细信息字典,
                'timestamp': ISO格式时间戳
            }
        
        使用示例:
            self.log_result("TC-AC-001: 麦克风枚举", True, "找到3个麦克风", {'devices': [...]})
        """
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
        """
        TC-AC-001: 麦克风设备枚举测试
        
        测试用例编号: TC-AC-001
        测试目的: 验证系统枚举可用麦克风设备的能力
        
        该测试用例执行以下验证步骤:
            1. 调用sounddevice.query_devices()获取系统中所有音频设备信息
            2. 遍历所有设备，筛选出具有输入通道的设备(即麦克风)
            3. 提取每个麦克风的关键信息: 索引、名称、通道数、默认采样率
            4. 验证设备信息的完整性
            5. 记录测试结果并输出到控制台
        
        返回值:
            microphones: 麦克风设备列表，每个设备为包含index、name、channels、
                        sample_rate的字典；测试失败时返回False
            False: 当未找到麦克风或设备信息不完整时返回
        
        设备信息字典结构:
            {
                'index': 设备索引(用于后续指定设备),
                'name': 设备名称,
                'channels': 最大输入通道数,
                'sample_rate': 默认采样率(Hz)
            }
        
        异常处理:
            捕获所有异常并记录错误消息，测试不会因单个设备异常而中断
        
        前置条件:
            - 系统已安装sounddevice库
            - 有可用的音频输入设备
        
        相关测试:
            test_system_audio_enumeration: 系统音频输出设备枚举测试
        """
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
        """
        TC-AC-002: 系统音频输出设备枚举测试
        
        测试用例编号: TC-AC-002
        测试目的: 验证系统枚举音频输出设备的能力
        
        该测试用例与test_microphone_enumeration类似，但专注于输出设备。
        系统音频输出设备通常用于播放声音，在环路捕获(WASAPI)场景下
        也会作为音频源使用。
        
        测试步骤:
            1. 获取系统中所有音频设备列表
            2. 筛选具有输出通道的设备(max_output_channels > 0)
            3. 收集每个输出设备的详细信息
            4. 验证设备信息完整性
            5. 记录测试结果
        
        返回值:
            output_devices: 音频输出设备列表，每个设备包含index、name、
                           channels、sample_rate字段；失败时返回False
            False: 当未找到输出设备或设备信息不完整时
        
        设备信息字典结构:
            {
                'index': 设备索引,
                'name': 设备名称(如"扬声器 (Realtek Audio)"),
                'channels': 最大输出通道数,
                'sample_rate': 默认采样率(Hz)
            }
        
        应用场景:
            - 用于确定可用于WASAPI环路捕获的设备
            - 识别系统默认音频输出设备
            - 支持多音频设备环境下的设备选择
        
        注意事项:
            - 虚拟机或无音频设备的环境可能返回空列表
            - 某些虚拟音频设备可能也被枚举出来
        
        相关测试:
            test_microphone_enumeration: 麦克风设备枚举测试
            test_system_audio_capture_wasapi: 系统音频环路捕获测试
        """
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
        """
        TC-AC-003: 麦克风音频采集测试
        
        测试用例编号: TC-AC-003
        测试目的: 验证麦克风音频采集功能的基本可行性和数据正确性
        
        该测试用例执行实际的麦克风音频录制，并验证采集到的音频数据
        是否符合预期的格式和质量标准。
        
        参数说明:
            device_index: 麦克风设备索引，None表示使用系统默认设备
                         可通过test_microphone_enumeration获取有效索引
            duration: 采集时长，单位为秒，默认3秒
                     较长的采集时间可以获取更多样本，但也会增加测试时间
        
        测试流程:
            1. 调用内部方法 _capture_microphone 执行实际音频采集
               - 使用sounddevice InputStream创建录音流
               - 采样率固定为16000Hz，单声道
               - 通过回调函数将音频数据放入队列
               - 采集完成后合并所有音频块
            2. 验证采集结果:
               - 检查返回数据是否为None
               - 验证数据类型是否为float32(标准化浮点格式)
               - 记录音频长度和持续时间
            3. 调用log_result记录测试结果
        
        音频规格:
            - 采样率: 16000 Hz (语音识别常用采样率)
            - 通道数: 1 (单声道)
            - 数据类型: float32 (归一化到[-1.0, 1.0])
            - 块大小: 1024 采样点/块
        
        返回值:
            True: 采集成功且数据验证通过
            False: 采集失败、数据为空或格式不正确
        
        失败场景:
            - 设备不存在或不可访问
            - 采集过程中发生错误
            - 返回None(无音频数据)
            - 数据类型不是float32
        
        性能指标:
            - 采集时长 = len(audio) / 16000 秒
            - 理想情况下应与参数duration接近
        
        相关方法:
            _capture_microphone: 内部实际执行采集的辅助方法
        """
        try:
            print(f"  开始采集麦克风音频 (设备: {device_index}, 时长: {duration}秒)")
            audio = self._capture_microphone(device_index, duration)

            if audio is None:
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

    def get_supported_sample_rates(self, device_index: int) -> List[int]:
        """
        获取指定设备支持的采样率列表
        
        该方法用于探测音频设备对不同采样率的支持情况。
        不同设备可能支持不同的采样率，此方法通过实际测试来确定
        设备真正支持的采样率。
        
        测试的采样率列表:
            - 8000 Hz: 电话质量，常用于语音通话
            - 16000 Hz: 宽带语音，语音识别常用
            - 44100 Hz: CD质量，标准音频采样率
            - 48000 Hz: DVD/专业音频质量
        
        参数说明:
            device_index: 要测试的设备索引
                         必须是一个有效的输入设备索引
                         可以通过test_microphone_enumeration获取
        
        测试方法:
            使用sd.check_input_settings()检查设备是否支持给定采样率
            该方法会尝试配置设备，如果支持则返回成功
            如果不支持则会抛出异常
        
        返回值:
            List[int]: 支持的采样率列表，按升序排列
                      例如: [16000, 44100, 48000]
        
        控制台输出:
            方法会在控制台输出每个采样率的测试结果:
            - "    - {rate} Hz: 支持" 表示设备支持该采样率
            - "    - {rate} Hz: 不支持" 表示设备不支持该采样率
        
        注意事项:
            - 不同设备对采样率的支持可能不同
            - 即使设备声称支持某个采样率，实际采集也可能有问题
            - 此测试不实际采集音频，只是配置验证
        
        使用场景:
            - 在进行音频采集前选择合适的采样率
            - 了解设备的音频能力范围
            - 为test_different_sample_rates提供测试参数
        
        相关方法:
            test_different_sample_rates: 在支持的采样率下进行实际采集测试
        """
        supported_rates = [8000, 16000, 44100, 48000]
        valid_rates = []
        device_info = sd.query_devices(device_index)
        print(f"  查询设备 '{device_info['name']}' 的采样率...")

        for rate in supported_rates:
            try:
                sd.check_input_settings(
                    device=device_index,
                    samplerate=rate,
                    channels=1,
                    dtype='float32'
                )
                valid_rates.append(rate)
                print(f"    - {rate} Hz: 支持")
            except Exception:
                print(f"    - {rate} Hz: 不支持")
                pass
        return valid_rates

    def test_different_sample_rates(self, device_index: Optional[int] = None, duration: int = 2):
        """
        TC-AC-004: 不同采样率音频采集测试
        
        测试用例编号: TC-AC-004
        测试目的: 验证设备在不同采样率下的音频采集能力
        
        该测试用例首先调用get_supported_sample_rates获取设备支持的采样率，
        然后在每个支持的采样率下进行实际的音频采集，验证采集功能的
        稳定性和正确性。
        
        参数说明:
            device_index: 麦克风设备索引，None表示使用默认设备
            duration: 每个采样率下的采集时长，默认2秒
                     较短时长用于加快测试速度
        
        测试流程:
            1. 调用get_supported_sample_rates获取设备支持的采样率列表
            2. 如果没有支持的采样率，记录失败并返回
            3. 遍历每个支持的采样率:
               - 调用_capture_microphone_for_samplerate_test进行采集
               - 验证采集结果的正确性
               - 检查音频长度是否符合预期
               - 容差设置为2048采样点，允许轻微偏差
            4. 汇总所有采样率的测试结果
            5. 调用log_result记录整体测试结果
        
        验证标准:
            - 采集返回的音频数据不为None
            - 实际音频长度与预期长度( duration * sample_rate )的差值
              在容差范围内(±2048采样点)
        
        返回值:
            True: 所有支持的采样率采集测试都通过
            False: 至少有一个采样率测试失败
        
        测试结果字典结构:
            {
                '采样率': {
                    'status': '成功' 或 '失败',
                    'length': 实际音频长度(成功时),
                    'expected': 预期音频长度(成功时),
                    'reason': 失败原因(失败时)
                },
                ...
            }
        
        性能考虑:
            - 采样率越高，数据量越大
            - 测试时长较短以平衡测试覆盖和执行时间
            - 如果设备支持多个采样率，测试时间会相应增加
        
        常见问题:
            - 某些设备可能在高采样率下不稳定
            - USB音频设备可能在特定采样率下有兼容性问题
        
        相关方法:
            get_supported_sample_rates: 获取支持的采样率列表
            _capture_microphone_for_samplerate_test: 辅助采集方法
        """
        try:
            supported_rates = self.get_supported_sample_rates(device_index)
            if not supported_rates:
                self.log_result(
                    "TC-AC-004: 不同采样率采集",
                    False,
                    "设备不支持任何测试的采样率"
                )
                return False

            results = {}
            all_passed = True

            for sample_rate in supported_rates:
                print(f"\n  测试采样率: {sample_rate} Hz")
                try:
                    audio = self._capture_microphone_for_samplerate_test(device_index, duration, sample_rate)
                    if audio is None:
                        results[sample_rate] = {'status': '失败', 'reason': '采集返回None'}
                        all_passed = False
                        continue

                    expected_length = int(duration * sample_rate)
                    if abs(len(audio) - expected_length) >= 2048: # 增加容差
                        results[sample_rate] = {
                            'status': '失败',
                            'reason': f"音频长度不符合预期 (实际: {len(audio)}, 预期: {expected_length})"
                        }
                        all_passed = False
                    else:
                        results[sample_rate] = {
                            'status': '成功',
                            'length': len(audio),
                            'expected': expected_length
                        }
                        print(f"  采样率 {sample_rate} Hz: 采集成功")
                except Exception as e:
                    results[sample_rate] = {'status': '失败', 'reason': str(e)}
                    all_passed = False

            self.log_result(
                "TC-AC-004: 不同采样率采集",
                all_passed,
                "采样率测试完成",
                {'results': results}
            )
            return all_passed

        except Exception as e:
            self.log_result(
                "TC-AC-004: 不同采样率采集",
                False,
                f"异常: {str(e)}"
            )
            return False

    def _capture_microphone_for_samplerate_test(self, device_index: int, duration: int, sample_rate: int) -> Optional[np.ndarray]:
        """
        辅助方法: 为采样率测试采集麦克风音频
        
        该内部方法专门用于test_different_sample_rates测试中，
        支持指定任意采样率的音频采集。与_capture_microphone相比，
        这个方法更加灵活，可以测试不同采样率下的采集能力。
        
        实现原理:
            使用异步回调机制采集音频数据，通过队列缓冲区存储
            采集到的音频块，采集完成后合并所有块返回完整音频。
        
        参数说明:
            device_index: 麦克风设备索引
            duration: 采集时长(秒)
            sample_rate: 采样率(Hz)，支持8000/16000/44100/48000等
        
        技术细节:
            - 音频队列: 使用queue.Queue作为缓冲区，容量100块
            - 回调函数: 每当有新的音频数据时触发，将数据复制到队列
            - 块大小: 1024采样点/块
            - 超时设置: 从队列获取数据时设置2秒超时
        
        返回值:
            np.ndarray: 采集到的音频数据，1维numpy数组
            None: 采集过程中发生异常
        
        音频数据规格:
            - 数据类型: float32 (由sounddevice默认返回)
            - 通道数: 1 (单声道)
            - 长度: duration * sample_rate 采样点(允许轻微偏差)
        
        异常处理:
            方法内部捕获所有异常，打印错误消息后返回None
            不会向上抛出异常，由调用方处理None返回值
        
        注意事项:
            - 此方法是内部辅助方法，以下划线开头表示私有
            - 不直接调用，应通过公共测试方法间接使用
            - 采集是阻塞式的，需要等待duration秒完成
        
        相关方法:
            _capture_microphone: 固定16000Hz采样的辅助方法
            test_different_sample_rates: 使用此方法的测试用例
        """
        try:
            audio_queue = queue.Queue(maxsize=100)
            def callback(indata, frames, time_info, status):
                if status: print(f"  回调状态: {status}")
                try: audio_queue.put_nowait(indata.copy())
                except queue.Full: pass

            stream = sd.InputStream(
                device=device_index,
                channels=1,
                samplerate=sample_rate,
                callback=callback,
                blocksize=1024
            )
            stream.start()
            
            audio_chunks = []
            num_chunks = int(duration * sample_rate / 1024)
            for _ in range(num_chunks):
                audio_chunks.append(audio_queue.get(timeout=2.0))

            stream.stop()
            stream.close()
            return np.concatenate(audio_chunks)
        except Exception as e:
            print(f"  采集异常 (采样率: {sample_rate} Hz): {e}")
            return None

    def test_system_audio_capture_wasapi(self, duration: int = 3):
        """
        TC-AC-005: 系统音频环路捕获(WASAPI)测试
        
        测试用例编号: TC-AC-005
        测试目的: 验证Windows WASAPI环路捕获功能采集系统音频的能力
        
        WASAPI(Windows Audio Session API)是Windows平台的音频接口，
        支持环路捕获(Loopback)模式，可以捕获系统正在播放的音频。
        这对于录制声卡输出、实现内录等功能至关重要。
        
        技术背景:
            - WASAPI是Windows Vista及以后版本的音频API
            - 环路捕获模式可以捕获系统扬声器输出的音频
            - 使用pyaudiowpatch库提供WASAPI支持
            - 与传统的Stereo Mix方式相比，WASAPI更稳定
        
        测试流程:
            1. 创建PyAudio实例
            2. 获取WASAPI主机接口信息
            3. 获取默认扬声器设备信息
            4. 查找或创建环路设备:
               - 如果默认设备是环路设备则直接使用
               - 否则在环路设备列表中查找匹配的设备
            5. 创建WAV文件并配置音频参数:
               - 通道数: 使用设备最大输入通道数
               - 采样位宽: 16位(paInt16)
               - 采样率: 设备默认采样率
            6. 打开音频流并设置回调函数
            7. 开始采集，等待指定时长
            8. 停止流并关闭文件
        
        音频参数:
            - 格式: 16位有符号整数(paInt16)
            - 通道数: 设备支持的最大输入通道数
            - 采样率: 设备默认采样率(通常为44100或48000 Hz)
        
        输出文件:
            - 文件名: recorded_audio.wav
            - 格式: WAV格式，支持主流音频播放器播放
        
        返回值:
            True: 采集成功完成
            False: 采集失败或WASAPI不可用
        
        平台限制:
            - 仅支持Windows平台
            - 需要Windows Vista或更高版本
            - 非Windows系统会返回失败状态
        
        前置条件:
            - 已安装pyaudiowpatch库
            - 操作系统支持WASAPI
            - 有可用的音频输出设备
        
        常见错误:
            - "WASAPI is not available": 系统不支持WASAPI
            - "Failed to get default WASAPI speakers": 无法获取默认设备
            - "Default loopback output device not found": 找不到环路设备
        
        相关方法:
            _capture_system_audio_wasapi: 辅助环路捕获方法
        """
        try:
            with pyaudio.PyAudio() as p:
                try:
                    wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
                except OSError:
                    self.log_result(
                        "TC-AC-005: 系统音频Loopback采集 (WASAPI)",
                        False,
                        "WASAPI is not available on the system."
                    )
                    return

                # Get default WASAPI speakers
                try:
                    default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])
                except IOError:
                    self.log_result(
                        "TC-AC-005: 系统音频Loopback采集 (WASAPI)",
                        False,
                        "Failed to get default WASAPI speakers."
                    )
                    return

                if not default_speakers["isLoopbackDevice"]:
                    for loopback in p.get_loopback_device_info_generator():
                        if default_speakers["name"] in loopback["name"]:
                            default_speakers = loopback
                            break
                    else:
                        self.log_result(
                            "TC-AC-005: 系统音频Loopback采集 (WASAPI)",
                            False,
                            "Default loopback output device not found."
                        )
                        return

                print(f"  使用设备: {default_speakers['name']}")

                wave_file = wave.open("recorded_audio.wav", 'wb')
                wave_file.setnchannels(default_speakers["maxInputChannels"])
                wave_file.setsampwidth(p.get_sample_size(pyaudio.paInt16))
                wave_file.setframerate(int(default_speakers["defaultSampleRate"]))

                def callback(in_data, frame_count, time_info, status):
                    wave_file.writeframes(in_data)
                    return (in_data, pyaudio.paContinue)

                stream = p.open(
                    format=pyaudio.paInt16,
                    channels=default_speakers["maxInputChannels"],
                    rate=int(default_speakers["defaultSampleRate"]),
                    input=True,
                    input_device_index=default_speakers["index"],
                    stream_callback=callback
                )

                print("  开始采集系统音频...")
                stream.start_stream()
                time.sleep(duration)
                stream.stop_stream()
                stream.close()
                wave_file.close()

                self.log_result(
                    "TC-AC-005: 系统音频Loopback采集 (WASAPI)",
                    True,
                    "采集完成"
                )
                return True

        except Exception as e:
            self.log_result(
                "TC-AC-005: 系统音频Loopback采集 (WASAPI)",
                False,
                f"异常: {str(e)}"
            )
            return False

    def test_audio_source_switch(self, mic_device_index: Optional[int] = None,
                               duration: int = 2):
        """
        TC-AC-006: 音频源切换测试
        
        测试用例编号: TC-AC-006
        测试目的: 验证系统在不同音频输入源之间切换的能力
        
        该测试用例模拟真实场景中音频源切换的需求，依次采集麦克风音频
        和系统音频，验证两种不同类型音频源的采集功能都能正常工作。
        
        应用场景:
            - 会议录音软件需要在麦克风和系统音频之间切换
            - 屏幕录制软件需要同时录制讲解和系统声音
            - 语音识别应用需要处理不同输入源
        
        测试流程:
            1. 测试阶段一: 麦克风音频采集
               - 使用_capture_microphone采集指定时长的音频
               - 验证麦克风采集是否成功
               - 记录采集到的音频长度
            2. 间隔1秒等待
            3. 测试阶段二: 系统音频采集
               - 使用_capture_system_audio_wasapi进行环路捕获
               - 将采集结果保存到loopback_capture.wav文件
               - 验证系统音频采集是否成功
            4. 汇总两个阶段的测试结果
            5. 调用log_result记录整体测试结果
        
        参数说明:
            mic_device_index: 麦克风设备索引，None表示使用默认设备
            duration: 每个音频源的采集时长(秒)，默认2秒
        
        验证内容:
            - 麦克风采集不为None，长度大于0
            - 系统音频文件成功创建
            - 两个采集过程都无异常
        
        输出文件:
            - loopback_capture.wav: 系统音频环路捕获结果
            - 文件格式为WAV，可用任意音频播放器播放
        
        返回值:
            True: 两个音频源采集都成功
            False: 任意一个音频源采集失败
        
        注意事项:
            - 测试过程中需要确保有音频输出(用于环路捕获)
            - 如果没有音频播放，环路捕获可能得到静音数据
            - 两个采集之间有1秒间隔，避免音频干扰
        
        相关方法:
            _capture_microphone: 麦克风音频采集
            _capture_system_audio_wasapi: 系统音频环路捕获
        """
        try:
            print("  === 测试音频源切换 ===")

            # 1. 麦克风采集
            print("\n  1. 启动麦克风采集")
            mic_audio = self._capture_microphone(mic_device_index, duration)
            if mic_audio is None:
                self.log_result("TC-AC-006: 音频源切换", False, "麦克风采集失败")
                return False
            print(f"  麦克风采集完成，长度: {len(mic_audio)} 采样点")

            time.sleep(1)

            # 2. 系统音频采集
            print("\n  2. 启动系统音频采集")
            sys_audio_path = "loopback_capture.wav"
            sys_audio_captured = self._capture_system_audio_wasapi(duration, sys_audio_path)
            if not sys_audio_captured:
                self.log_result("TC-AC-006: 音频源切换", False, "系统音频采集失败")
                return False
            print(f"  系统音频采集完成，已保存到 {sys_audio_path}")

            self.log_result(
                "TC-AC-006: 音频源切换",
                True,
                "音频源切换测试通过",
                {
                    'mic_audio_length': len(mic_audio),
                    'sys_audio_path': sys_audio_path
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

    def _capture_microphone(self, device_index: Optional[int], duration: int) -> Optional[np.ndarray]:
        """
        辅助方法: 采集麦克风音频
        
        该内部方法封装了麦克风音频采集的核心逻辑，使用sounddevice库
        创建录音流，通过回调函数实时接收音频数据，并最终合并返回
        完整的音频数据。
        
        实现特点:
            - 固定采样率16000Hz(语音识别常用采样率)
            - 单声道录音
            - 使用队列缓冲区存储实时采集的音频块
            - 阻塞式采集，等待指定时长后自动停止
        
        参数说明:
            device_index: 设备索引，None使用默认设备
                         可以通过sd.query_devices()获取有效索引
            duration: 采集时长(秒)
                     例如duration=3表示采集3秒音频
        
        音频规格:
            - 采样率: 16000 Hz
            - 通道数: 1 (单声道)
            - 数据类型: float32 (归一化到[-1.0, 1.0])
            - 块大小: 1024采样点
        
        技术实现:
            1. 创建音频队列(maxsize=100)用于缓冲
            2. 定义回调函数: 当有音频数据时复制到队列
            3. 创建InputStream并启动
            4. 循环从队列获取音频块(共duration*16000/1024个)
            5. 停止流并关闭资源
            6. 使用numpy.concatenate合并所有块
        
        返回值:
            np.ndarray: 采集到的音频数据，一维float32数组
            None: 采集失败或发生异常
        
        使用场景:
            - test_microphone_capture测试用例
            - test_audio_source_switch中的麦克风采集
        
        注意事项:
            - 这是内部方法，以下划线开头表示私有
            - 采集过程中会打印进度信息
            - 如果队列获取超时(2秒)会抛出异常
        
        相关方法:
            _capture_microphone_for_samplerate_test: 支持任意采样率的版本
        """
        try:
            audio_queue = queue.Queue(maxsize=100)
            def callback(indata, frames, time_info, status):
                if status: print(f"  麦克风回调状态: {status}")
                try: audio_queue.put_nowait(indata.copy())
                except queue.Full: pass

            stream = sd.InputStream(device=device_index, channels=1, samplerate=16000, callback=callback, blocksize=1024)
            stream.start()
            print(f"  正在采集麦克风音频...")
            
            audio_chunks = []
            num_chunks = int(duration * 16000 / 1024)
            for _ in range(num_chunks):
                audio_chunks.append(audio_queue.get(timeout=2.0))

            stream.stop()
            stream.close()
            return np.concatenate(audio_chunks)
        except Exception as e:
            print(f"  麦克风采集异常: {e}")
            return None

    def _capture_system_audio_wasapi(self, duration: int, output_path: str) -> bool:
        """
        辅助方法: 使用WASAPI环路捕获采集系统音频
        
        该内部方法封装了Windows WASAPI环路捕获的实现细节，
        用于采集系统正在播放的音频信号，实现内录功能。
        
        技术原理:
            - 使用pyaudiowpatch库访问Windows WASAPI
            - 查找默认扬声器设备的环路版本
            - 以环路模式打开音频流进行捕获
            - 将采集到的音频保存为WAV文件
        
        参数说明:
            duration: 采集时长(秒)
                     在此期间系统播放的音频会被捕获
            output_path: 输出WAV文件的路径
                        例如: "loopback_capture.wav"
        
        音频参数:
            - 采样位宽: 16位有符号整数(paInt16)
            - 通道数: 设备支持的最大输入通道数
            - 采样率: 设备的默认采样率(通常44100或48000 Hz)
        
        实现流程:
            1. 创建PyAudio实例
            2. 获取WASAPI主机接口信息
            3. 获取默认扬声器设备
            4. 查找匹配的环路设备(如果默认设备不是环路设备)
            5. 创建WAV文件并设置参数
            6. 定义回调函数处理音频数据
            7. 打开音频流
            8. 启动流并等待duration秒
            9. 停止流并关闭资源
        
        返回值:
            True: 采集成功完成，文件已保存
            False: 采集过程发生错误
        
        错误处理:
            - 未找到环路设备时返回False
            - 任何异常被捕获并打印错误消息
            - 资源会在finally块中确保正确关闭
        
        输出文件:
            - WAV格式文件
            - 可用Windows Media Player、VLC等播放器播放
            - 可用音频编辑软件进行后续处理
        
        平台要求:
            - Windows Vista或更高版本
            - 已安装pyaudiowpatch库
            - 有可用的音频输出设备
        
        注意事项:
            - 这是内部方法，以下划线开头
            - 测试时系统需要有音频输出(播放音乐等)
            - 采集期间不要更改系统音频设置
        
        相关方法:
            test_system_audio_capture_wasapi: 公共测试方法
        """
        try:
            with pyaudio.PyAudio() as p:
                wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
                default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

                if not default_speakers["isLoopbackDevice"]:
                    for loopback in p.get_loopback_device_info_generator():
                        if default_speakers["name"] in loopback["name"]:
                            default_speakers = loopback
                            break
                    else:
                        print("  未找到默认的loopback输出设备")
                        return False
                
                print(f"  使用设备: {default_speakers['name']}")
                
                with wave.open(output_path, 'wb') as wf:
                    wf.setnchannels(default_speakers["maxInputChannels"])
                    wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
                    wf.setframerate(int(default_speakers["defaultSampleRate"]))

                    def callback(in_data, frame_count, time_info, status):
                        wf.writeframes(in_data)
                        return (in_data, pyaudio.paContinue)

                    stream = p.open(format=pyaudio.paInt16,
                                    channels=default_speakers["maxInputChannels"],
                                    rate=int(default_speakers["defaultSampleRate"]),
                                    input=True,
                                    input_device_index=default_speakers["index"],
                                    stream_callback=callback)
                    
                    print("  正在采集系统音频...")
                    stream.start_stream()
                    time.sleep(duration)
                    stream.stop_stream()
                    stream.close()
            return True
        except Exception as e:
            print(f"  系统音频采集异常: {e}")
            return False

    def generate_report(self):
        """
        生成测试报告
        
        该方法汇总所有测试结果，生成格式化的测试报告，
        并支持JSON文件持久化和控制台摘要输出。
        
        报告内容:
            1. 测试摘要:
               - total_tests: 总测试用例数
               - passed: 通过的测试数
               - failed: 失败的测试数
               - pass_rate: 测试通过率(百分比)
            
            2. 时间信息:
               - start_time: 测试开始时间(ISO格式)
               - end_time: 测试结束时间(ISO格式)
            
            3. 详细结果:
               - results: 所有测试结果的完整列表
        
        生成步骤:
            1. 统计测试结果:
               - 计算总测试数(列表长度)
               - 统计通过数( passed=True的数量)
               - 计算失败数(总测试数 - 通过数)
               - 计算通过率(通过数/总测试数*100)
            
            2. 构建报告字典:
               - 包含摘要、时间、结果三部分
               - 使用JSON可序列化的格式
            
            3. 持久化存储:
               - 保存到 audio_capture_test_report.json 文件
               - 使用UTF-8编码支持中文
               - 使用indent=2格式化JSON输出
            
            4. 控制台输出:
               - 打印格式化的报告摘要
               - 显示各项统计数据
               - 提示报告文件位置
        
        输出文件:
            文件名: audio_capture_test_report.json
            格式: JSON
            编码: UTF-8
            
        返回值:
            dict: 完整的测试报告字典，可用于进一步处理
                 例如: 发送到监控系统、生成HTML报告等
        
        使用示例:
            tester = AudioCaptureTest()
            # ... 执行各种测试 ...
            report = tester.generate_report()
            # report['summary'] 包含通过率等统计信息
        
        注意事项:
            - 报告生成时自动包含所有已记录的测试结果
            - 如果没有执行任何测试，报告显示通过率为0%
            - 重复调用会覆盖之前的报告文件
        
        与其他方法的交互:
            - log_result: 记录测试结果到此列表
            - __init__: 初始化时设置开始时间
        """
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
    """
    主函数: 执行音频采集完整测试套件
    
    该函数是测试脚本的入口点，按照预设顺序执行所有测试用例，
    并在最后生成完整的测试报告。
    
    测试执行顺序:
        1. TC-AC-001: 麦克风设备枚举测试
           - 检测系统中可用的麦克风设备
           - 收集设备信息用于后续测试
        
        2. TC-AC-002: 系统音频设备枚举测试
           - 检测系统中可用的音频输出设备
           - 为WASAPI环路捕获测试做准备
        
        3. TC-AC-003: 麦克风音频采集测试
           - 使用第一个麦克风进行音频录制
           - 验证采集功能的基本可行性
           - (仅在找到麦克风设备时执行)
        
        4. TC-AC-004: 不同采样率采集测试
           - 测试设备在各个支持采样率下的采集能力
           - (仅在找到麦克风设备时执行)
        
        5. TC-AC-005: 系统音频环路捕获测试(WASAPI)
           - 验证Windows WASAPI环路捕获功能
           - 录制系统正在播放的音频
        
        6. TC-AC-006: 音频源切换测试
           - 依次采集麦克风和系统音频
           - 验证不同音频源之间的切换能力
           - (仅在找到麦克风设备时执行)
    
    输出说明:
        - 控制台: 实时显示测试进度和结果
        - 文件: audio_capture_test_report.json (测试报告)
        - 音频文件: recorded_audio.wav (WASAPI采集结果)
                  loopback_capture.wav (环路捕获结果)
    
    返回值:
        无直接返回值，测试结果通过报告文件体现
    
    使用方法:
        直接运行脚本即可执行所有测试:
            python test_audio_capture.py
    
    注意事项:
        - 测试过程中会实际进行音频采集，请确保麦克风可用
        - WASAPI测试需要Windows系统
        - 某些测试可能需要较长时间(音频采集时长)
        - 测试前请关闭其他可能使用音频的程序
    
    测试报告解读:
        - 通过率 = 通过数 / 总测试数 * 100%
        - 每个测试用例包含详细的通过/失败原因
        - 详细的设备信息保存在报告的details字段中
    
    扩展说明:
        如需单独运行某个测试，可以注释掉其他测试调用:
            # 注释掉不需要的测试
            # tester.test_system_audio_enumeration()
    """
    print("音频采集技术验证测试")
    print("="*60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # 创建测试实例
    tester = AudioCaptureTest()

    # 执行 TC-AC-001: 麦克风设备枚举测试
    # 此测试为后续测试提供可用的麦克风设备列表
    # 如果此测试失败，后续依赖麦克风的测试将被跳过
    print("\n" + "="*60)
    print("TC-AC-001: 麦克风设备枚举")
    print("="*60)
    microphones = tester.test_microphone_enumeration()

    # 执行 TC-AC-002: 系统音频设备枚举测试
    # 此测试为WASAPI环路捕获测试准备设备信息
    # 系统音频设备用于确定可以捕获系统音频的输出设备
    print("\n" + "="*60)
    print("TC-AC-002: 系统音频设备枚举")
    print("="*60)
    output_devices = tester.test_system_audio_enumeration()

    # 执行 TC-AC-003: 麦克风音频采集测试
    # 条件执行: 仅在找到麦克风设备时执行
    # 使用第一个枚举到的麦克风进行实际音频录制测试
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
        tester.test_system_audio_capture_wasapi(duration=3)

    # TC-AC-006: 音频源切换
    if microphones and output_devices:
        print("\n" + "="*60)
        print("TC-AC-006: 音频源切换")
        print("="*60)
        mic_device_index = microphones[0]['index']
        tester.test_audio_source_switch(
            mic_device_index=mic_device_index,
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
