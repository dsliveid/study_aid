"""
音频处理技术验证测试模块

本模块提供了一套完整的音频信号处理功能测试用例，用于验证和评估音频处理
算法的正确性和性能。测试涵盖了从基础的量化编码到高级的频谱处理等核心技术。

测试用例编号规则:
- TC-AP-001 ~ TC-AP-013: 代表音频处理(Audio Processing)不同测试场景

主要测试功能分类:
1. 编码解码测试:
   - 音频量化 (TC-AP-001): 测试不同位深的量化精度
   - PCM转换 (TC-AP-002): 测试浮点数与整数的互转
   - 位深转换 (TC-AP-010): 测试16位整数的转换精度

2. 信号预处理测试:
   - 预加重 (TC-AP-004): 测试高频增强滤波器
   - 高通滤波 (TC-AP-013): 测试低频噪声去除

3. 特征提取前置处理:
   - 分帧 (TC-AP-005): 测试短时分析窗口分割
   - 加窗 (TC-AP-006): 测试汉明窗应用

4. 声道处理测试:
   - 立体声转单声道 (TC-AP-008): 测试声道混合
   - 单声道转立体声 (TC-AP-009): 测试声道复制

5. 归一化处理测试:
   - 峰值归一化 (TC-AP-011): 测试幅度归一化
   - RMS归一化 (TC-AP-012): 测试能量归一化

依赖库:
- unittest: Python内置单元测试框架
- numpy: 数值计算和数组操作
- scipy: 信号处理和科学计算

使用说明:
    1. 直接运行本脚本执行所有测试用例
    2. 使用 pytest 运行: pytest test_audio_processing.py -v
    3. 运行单个测试: python -m unittest test_audio_processing.AudioProcessingTest.test_quantization

作者: AI Assistant
创建时间: 2024
"""

import unittest
import numpy as np
from scipy.io import wavfile
import os

class AudioProcessingTest(unittest.TestCase):
    """
    音频处理测试类
    
    该类继承自unittest.TestCase，提供了一套完整的音频处理功能单元测试。
    测试类采用标准的unittest框架设计，支持独立运行或集成到测试套件中。
    
    测试覆盖范围:
    1. 数值精度测试:
       - 量化精度: 验证不同位深(8bit/16bit)下的量化误差
       - PCM转换: 验证浮点与整数格式的互转精度
       - 位深转换: 验证16位整数的无损转换
    
    2. 信号处理测试:
       - 预加重: 验证一阶高通滤波器的高频增强效果
       - 高通滤波: 验证巴特沃斯滤波器对低频噪声的抑制
    
    3. 特征提取前置处理:
       - 分帧: 验证短时分析的帧分割正确性
       - 加窗: 验证汉明窗的频谱泄漏抑制
    
    4. 声道处理测试:
       - 立体声转单声道: 验证双声道混合算法
       - 单声道转立体声: 验证声道复制算法
    
    5. 幅度归一化测试:
       - 峰值归一化: 验证最大幅度的缩放
       - RMS归一化: 验证能量归一化
    
    测试框架特性:
    - 每个测试方法独立运行，互不干扰
    - 使用numpy.testing进行数值验证
    - 控制台输出详细的测试进度和结果
    - 支持单独运行某个测试或全部测试
    
    使用示例:
        # 运行所有测试
        python test_audio_processing.py
        
        # 运行特定测试
        python -m unittest test_audio_processing.AudioProcessingTest.test_quantization
        
        # 使用pytest运行
        pytest test_audio_processing.py -v
    
    验证方法说明:
        - np.testing.assert_allclose: 验证数组近似相等(支持浮点误差)
        - np.testing.assert_array_equal: 验证数组完全相等
        - self.assertEqual/AlmostEqual: 验证标量值相等
        - self.assertLess: 验证数值大小关系
    """

    def test_quantization(self):
        """
        TC-AP-001: 音频量化测试
        
        测试用例编号: TC-AP-001
        测试目的: 验证音频信号在不同位深度下的量化精度
        
        量化是将连续幅度的模拟信号转换为离散幅度的数字信号的过程。
        位深度决定了每个采样点可以表示的离散级别数量。
        
        测试原理:
            量化公式: quantized = round(audio * 2^(bits-1)) / 2^(bits-1)
            - 将浮点音频从[-1, 1]范围映射到整数范围
            - 16位量化: 范围[-32768, 32767]，共65536个级别
            - 8位量化: 范围[-128, 127]，共256个级别
        
        测试数据:
            输入: [-1.0, -0.5, 0.0, 0.5, 1.0] (归一化浮点音频)
            期望输出: 对应位深的离散化值
        
        验证方法:
            使用np.testing.assert_allclose验证量化结果与理论值的接近程度
            - 16位量化使用rtol=1e-4(0.01%相对误差)
            - 8位量化使用rtol=1e-2(1%相对误差，允许更大误差)
        
        应用场景:
            - 音频编解码(MP3/AAC等)
            - 数字音频存储(WAV/FLAC等)
            - 语音识别前处理
        
        位深度说明:
            - 16位: CD质量，常用标准
            - 8位: 电话质量，已较少使用
            - 24位: 专业音频
            - 32位: 浮点精度
        """
        print("\n============================================================")
        print("TC-AP-001: 测试音频量化")
        print("============================================================")
        
        def quantize(audio, bits=16):
            """量化音频信号到指定位深度
            
            参数:
                audio: 归一化的浮点音频数组，范围[-1.0, 1.0]
                bits: 量化位深度，支持8/16/24/32位
                
            返回:
                量化后的归一化浮点数组
            """
            max_val = 2 ** (bits - 1)
            quantized = np.round(audio * max_val)
            return quantized / max_val

        audio = np.array([-1.0, -0.5, 0.0, 0.5, 1.0])
        
        # Test 16-bit quantization
        quantized_16bit = quantize(audio, bits=16)
        expected_16bit = np.array([-32768., -16384., 0., 16384., 32768.]) / 32768.
        np.testing.assert_allclose(quantized_16bit, expected_16bit, rtol=1e-4)
        print("✅ 16-bit 量化测试通过")

        # Test 8-bit quantization
        quantized_8bit = quantize(audio, bits=8)
        expected_8bit = np.array([-128., -64., 0., 64., 128.]) / 128.
        np.testing.assert_allclose(quantized_8bit, expected_8bit, rtol=1e-2)
        print("✅ 8-bit 量化测试通过")
        print("✅ 通过: TC-AP-001: 音频量化")

    def test_pcm_conversion(self):
        """
        TC-AP-002: PCM转换测试
        
        测试用例编号: TC-AP-002
        测试目的: 验证PCM(Pulse Code Modulation)格式的编码解码转换精度
        
        PCM是数字音频的基础编码方式，将模拟信号采样后量化为数字值。
        测试验证浮点格式与16位整数格式之间的无损转换能力。
        
        转换原理:
            浮点转整数: int16 = round(float * 32767)
            整数转浮点: float = int16 / 32767.0
        
        测试流程:
            1. 创建浮点音频样本 [0.5, -0.3, 0.8]
            2. 转换为16位PCM整数格式
            3. 将整数序列转换为字节流(tobytes)
            4. 从字节流还原整数序列(frombuffer)
            5. 转换回浮点格式
            6. 验证还原结果与原始数据一致
        
        验证方法:
            使用np.testing.assert_allclose验证转换前后的近似相等
            容差设置为1e-4，允许浮点运算的微小误差
        
        PCM格式说明:
            - 16位PCM: 有符号整数，范围[-32768, 32767]
            - 字节序: 默认小端序(Little-endian)
            - 采样率: 决定了时间精度
            - 声道数: 决定了空间精度
        
        应用场景:
            - WAV文件读写
            - 音频编解码
            - 音频传输(RTP/网络传输)
            - 语音信号处理
        
        注意事项:
            - 转换过程中可能会有1个单位的舍入误差
            - 需要注意溢出问题(-1.0会映射到-32768)
        """
        print("\n============================================================")
        print("TC-AP-002: 测试PCM转换")
        print("============================================================")
        
        audio_float = np.array([0.5, -0.3, 0.8], dtype=np.float32)
        
        # Convert to 16-bit PCM
        audio_int16 = (audio_float * 32767).astype(np.int16)
        pcm_bytes = audio_int16.tobytes()
        
        # Convert back from 16-bit PCM
        audio_int16_from_bytes = np.frombuffer(pcm_bytes, dtype=np.int16)
        audio_float_from_bytes = audio_int16_from_bytes / 32767.0
        
        np.testing.assert_allclose(audio_float, audio_float_from_bytes, rtol=1e-4)
        print("✅ PCM 转换测试通过")
        print("✅ 通过: TC-AP-002: PCM转换")

    def test_pre_emphasis(self):
        """
        TC-AP-004: 预加重测试
        
        测试用例编号: TC-AP-004
        测试目的: 验证预加重滤波器的高频增强效果
        
        预加重是一种一阶高通滤波器，用于增强音频信号的高频成分。
        这在语音处理中尤为重要，因为高频能量通常低于低频。
        
        预加重公式:
            y[0] = x[0]
            y[n] = x[n] - α * x[n-1], n ≥ 1
        
        其中α是预加重系数，通常取0.97左右。
        
        测试原理:
            - 输入信号: [1.0, 0.5, 0.2, -0.1, -0.5]
            - 对每个样本(除第一个外)应用差分滤波
            - 验证输出与理论计算结果一致
        
        应用场景:
            - 语音识别(ASR)特征提取前置处理
            - 说话人识别
            - 语音增强
            - 消除信道效应
        
        预加重的作用:
            1. 提升高频共振峰能量，改善信噪比
            2. 补偿高频衰减
            3. 平衡频谱能量分布
            4. 减少低频干扰对特征的影响
        
        参数说明:
            alpha: 预加重系数，范围通常[0.9, 1.0]
                  - α接近1.0: 较弱的预加重
                  - α较小: 较强的预加重效果
        
        验证方法:
            使用np.testing.assert_allclose验证输出数组与理论值的接近程度
            容差设置为1e-5，确保数值计算精度
        """
        print("\n============================================================")
        print("TC-AP-004: 测试预加重")
        print("============================================================")

        def pre_emphasis(audio, alpha=0.97):
            """应用预加重滤波器
            
            参数:
                audio: 输入音频信号
                alpha: 预加重系数，默认0.97
                
            返回:
                预加重后的音频信号
            """
            return np.append(audio[0], audio[1:] - alpha * audio[:-1])

        audio = np.array([1.0, 0.5, 0.2, -0.1, -0.5])
        emphasized = pre_emphasis(audio)
        
        expected = np.array([1.0, 0.5 - 0.97 * 1.0, 0.2 - 0.97 * 0.5, -0.1 - 0.97 * 0.2, -0.5 - 0.97 * (-0.1)])
        np.testing.assert_allclose(emphasized, expected, rtol=1e-5)
        print("✅ 预加重测试通过")
        print("✅ 通过: TC-AP-004: 预加重")

    def test_framing(self):
        """
        TC-AP-005: 分帧测试
        
        测试用例编号: TC-AP-005
        测试目的: 验证短时分析的分帧算法正确性
        
        分帧是将连续音频信号分割成重叠的短时帧的过程，
        这是短时傅里叶变换(STFT)和MFCC特征提取的必要步骤。
        
        分帧参数说明:
            frame_length: 帧长(秒)，通常25ms(0.025)
            frame_shift: 帧移(秒)，通常10ms(0.010)
            sample_rate: 采样率(Hz)
        
        计算公式:
            frame_length_samples = round(frame_length * sample_rate)
            frame_shift_samples = round(frame_shift * sample_rate)
            num_frames = 1 + ceil((len(audio) - frame_length) / frame_shift)
        
        测试配置:
            - 采样率: 1000 Hz (低采样率便于测试)
            - 帧长: 0.1秒 (100采样点)
            - 帧移: 0.05秒 (50采样点)
            - 输入信号: 0-999共1000个样本
        
        帧数计算验证:
            - 帧长100样本，帧移50样本
            - 音频总长1000样本
            - 帧数 = 1 + ceil((1000-100)/50) = 19帧
        
        帧内容验证:
            - 第0帧: 索引0-99
            - 第1帧: 索引50-149
            - 验证帧边界正确性
        
        应用场景:
            - 短时傅里叶变换(STFT)
            - MFCC特征提取
            - 语音端点检测
            - 声学特征分析
        
        重叠说明:
            - 重叠帧可以捕捉帧边界的瞬态特征
            - 重叠量通常为帧长的25%-50%
            - 本测试使用50%重叠(帧移=帧长/2)
        """
        print("\n============================================================")
        print("TC-AP-005: 测试分帧")
        print("============================================================")

        def frame_audio(audio, sample_rate=16000, frame_length=0.025, frame_shift=0.010):
            """将音频信号分帧
            
            参数:
                audio: 输入音频信号(一维数组)
                sample_rate: 采样率(Hz)
                frame_length: 帧长(秒)，默认25ms
                frame_shift: 帧移(秒)，默认10ms
                
            返回:
                分帧后的音频，形状为(num_frames, frame_length_samples)
            """
            frame_length_samples = int(round(frame_length * sample_rate))
            frame_shift_samples = int(round(frame_shift * sample_rate))
            num_frames = 1 + int(np.ceil((len(audio) - frame_length_samples) / frame_shift_samples))
            
            pad_signal_length = (num_frames - 1) * frame_shift_samples + frame_length_samples
            z = np.zeros((pad_signal_length - len(audio)))
            pad_signal = np.append(audio, z)
            
            indices = np.tile(np.arange(0, frame_length_samples), (num_frames, 1)) + \
                      np.tile(np.arange(0, num_frames * frame_shift_samples, frame_shift_samples), (frame_length_samples, 1)).T
            frames = pad_signal[indices.astype(np.int32, copy=False)]
            return frames

        audio = np.arange(1000)
        frames = frame_audio(audio, sample_rate=1000, frame_length=0.1, frame_shift=0.05)
        
        self.assertEqual(frames.shape, (19, 100))
        np.testing.assert_array_equal(frames[0], np.arange(100))
        np.testing.assert_array_equal(frames[1], np.arange(50, 150))
        print("✅ 分帧测试通过")
        print("✅ 通过: TC-AP-005: 分帧")

    def test_windowing(self):
        """
        TC-AP-006: 加窗测试
        
        测试用例编号: TC-AP-006
        测试目的: 验证汉明窗(Hamming Window)的应用效果
        
        加窗是短时信号分析的必需步骤，用于减少帧边界处的不连续性
        和频谱泄漏现象。
        
        汉明窗公式:
            w[n] = 0.54 - 0.46 * cos(2πn/(N-1)), 0 ≤ n < N
        
        加窗作用:
            1. 减少频谱泄漏: 使帧边界处的幅度平滑过渡到零
            2. 避免吉布斯效应: 减少突然截断引起的振铃
            3. 保留主要能量: 窗函数中心权重较高
        
        测试原理:
            - 输入: 全1矩阵(2帧，每帧10样本)
            - 窗函数: 10点汉明窗
            - 预期输出: 每帧都乘以汉明窗系数
        
        验证方法:
            使用np.testing.assert_allclose验证加窗后结果与理论窗函数一致
        
        常见窗函数对比:
            - 矩形窗: 简单但频谱泄漏大
            - 汉明窗: 良好的频谱泄漏抑制
            - 汉宁窗: 更陡的过渡带
            - 布莱克曼窗: 更低的旁瓣
            - 凯泽窗: 可调参数控制权衡
        
        应用场景:
            - 短时傅里叶变换(STFT)
            - 滤波器设计
            - 频谱分析
            - 信号重建
        
        注意事项:
            - 加窗会损失能量，需要归一化补偿
            - 窗长选择影响频率分辨率和时间分辨率的权衡
            - 重叠相加法可以恢复原始信号能量
        """
        print("\n============================================================")
        print("TC-AP-006: 测试加窗")
        print("============================================================")

        def apply_window(frames):
            """对音频帧应用汉明窗
            
            参数:
                frames: 分帧后的音频信号，形状为(num_frames, frame_length)
                
            返回:
                加窗后的音频帧
            """
            frame_length = frames.shape[1]
            window = np.hamming(frame_length)
            return frames * window

        frames = np.ones((2, 10))
        windowed_frames = apply_window(frames)
        
        expected_window = np.hamming(10)
        np.testing.assert_allclose(windowed_frames[0], expected_window)
        np.testing.assert_allclose(windowed_frames[1], expected_window)
        print("✅ 加窗测试通过")
        print("✅ 通过: TC-AP-006: 加窗")

    def test_stereo_to_mono(self):
        """
        TC-AP-008: 立体声转单声道测试
        
        测试用例编号: TC-AP-008
        测试目的: 验证立体声音频混合为单声道的算法正确性
        
        立体声转单声道是将多声道信号合并为单声道的过程，
        常见方法包括平均混合和简单混合。
        
        混合公式:
            mono[n] = (left[n] + right[n]) / 2
        
        测试原理:
            - 输入: 3个样本的立体声音频 [[1,2], [3,4], [5,6]]
            - 期望输出: [1.5, 3.5, 5.5] (每对声道的平均值)
        
        单声道处理方法:
            1. 平均混合: (L + R) / 2
            2. 简单混合: L + R (可能需要归一化)
            3. 选择混合: 只取左声道或右声道
            4. 加权混合: 0.7*L + 0.3*R (环绕声等场景)
        
        应用场景:
            - 语音识别系统(通常只需单声道)
            - 音频存档和压缩
            - 移动设备播放
            - 音频特征提取
        
        验证方法:
            使用np.testing.assert_allclose验证混合结果与理论值一致
        
        注意事项:
            - 混合可能降低立体分离度
            - 相位相反的信号可能相互抵消
            - 需要考虑响度归一化
        """
        print("\n============================================================")
        print("TC-AP-008: 测试立体声转单声道")
        print("============================================================")

        def stereo_to_mono(audio):
            """将立体声音频转换为单声道
            
            参数:
                audio: 立体声音频，形状为(n_samples, 2)或(n_samples,)
                
            返回:
                单声道音频信号
            """
            if len(audio.shape) == 1:
                return audio
            return np.mean(audio, axis=1)

        stereo_audio = np.array([[1, 2], [3, 4], [5, 6]], dtype=np.float32)
        mono_audio = stereo_to_mono(stereo_audio)
        
        expected_mono = np.array([1.5, 3.5, 5.5])
        np.testing.assert_allclose(mono_audio, expected_mono)
        print("✅ 立体声转单声道测试通过")
        print("✅ 通过: TC-AP-008: 立体声转单声道")

    def test_mono_to_stereo(self):
        """
        TC-AP-009: 单声道转立体声测试
        
        测试用例编号: TC-AP-009
        测试目的: 验证单声道音频扩展为立体声的算法正确性
        
        单声道转立体声是将单声道信号复制到多个声道的过程，
        在某些应用场景下需要将单声道信号转换为立体声输出。
        
        扩展方法:
            stereo[n] = [mono[n], mono[n]]
            即左右声道都使用相同的单声道信号
        
        测试原理:
            - 输入: 单声道音频 [1, 2, 3]
            - 期望输出: 立体声 [[1,1], [2,2], [3,3]]
        
        单声道转立体声方法:
            1. 直接复制: 左右声道完全相同
            2. 轻微差异: 左右声道有微小差异增加空间感
            3. 混响处理: 添加空间混响效果
            4. 声道分离: 通过立体声编码器
        
        应用场景:
            - 旧录音修复
            - 视频配音匹配
            - 音频格式转换
            - 游戏音频处理
        
        验证方法:
            使用np.testing.assert_array_equal验证声道复制结果
        
        注意事项:
            - 简单的声道复制不会增加真实的立体感
            - 可以通过添加延迟或混响改善效果
            - 需要保持与原始单声道的能量一致
        """
        print("\n============================================================")
        print("TC-AP-009: 测试单声道转立体声")
        print("============================================================")

        def mono_to_stereo(audio):
            """将单声道音频转换为立体声
            
            参数:
                audio: 单声道音频信号
                
            返回:
                立体声音频信号，形状为(n_samples, 2)
            """
            if len(audio.shape) == 2:
                return audio
            return np.column_stack([audio, audio])

        mono_audio = np.array([1, 2, 3], dtype=np.float32)
        stereo_audio = mono_to_stereo(mono_audio)
        
        expected_stereo = np.array([[1, 1], [2, 2], [3, 3]])
        np.testing.assert_array_equal(stereo_audio, expected_stereo)
        print("✅ 单声道转立体声测试通过")
        print("✅ 通过: TC-AP-009: 单声道转立体声")

    def test_bit_depth_conversion(self):
        """
        TC-AP-010: 位深转换测试
        
        测试用例编号: TC-AP-010
        测试目的: 验证16位整數与浮点数之间的双向转换精度
        
        位深转换是数字音频处理中的基础操作，
        涉及浮点格式(范围[-1.0, 1.0])与整数格式之间的转换。
        
        转换公式:
            浮点转整数: int16 = round(float * 32767), 范围[-32767, 32767]
            整数转浮点: float = int16 / 32767.0, 范围[-1.0, 1.0]
        
        测试原理:
            1. 创建浮点音频 [-1.0, 0.0, 0.5, 1.0]
            2. 转换为16位整数格式
            3. 验证整数结果符合预期
            4. 转换回浮点格式
            5. 验证转换回的结果与原始值接近
        
        特殊情况处理:
            - -1.0 转换为 -32767 (非-32768，因为-1.0不完全等于-32768/32767)
            - 1.0 转换为 32767
            - 超出[-1.0, 1.0]范围的输入会被截断
        
        应用场景:
            - WAV文件读写(16位整数格式)
            - 音频编解码
            - 音频处理算法(通常使用浮点)
            - 音频传输
        
        验证方法:
            - 整数转换: 使用np.testing.assert_array_equal
            - 浮点转换: 使用np.testing.assert_allclose(atol=1e-4)
        
        位深度说明:
            - 8位: 无符号整数，范围[0, 255]
            - 16位: 有符号整数，范围[-32768, 32767]
            - 24位: 专业音频格式
            - 32位浮点: 高精度处理格式
        """
        print("\n============================================================")
        print("TC-AP-010: 测试位深转换")
        print("============================================================")

        def float_to_int16(audio):
            """将浮点音频转换为16位整数格式
            
            参数:
                audio: 归一化浮点音频，范围[-1.0, 1.0]
                
            返回:
                16位有符号整数数组
            """
            audio = np.clip(audio, -1.0, 1.0)
            return (audio * 32767).astype(np.int16)

        def int16_to_float(audio_int16):
            """将16位整数音频转换为浮点格式
            
            参数:
                audio_int16: 16位有符号整数数组
                
            返回:
                归一化浮点音频，范围[-1.0, 1.0]
            """
            return audio_int16.astype(np.float32) / 32767.0

        audio_float = np.array([-1.0, 0.0, 0.5, 1.0])
        audio_int16 = float_to_int16(audio_float)
        
        expected_int16 = np.array([-32767, 0, 16383, 32767], dtype=np.int16)
        np.testing.assert_array_equal(audio_int16, expected_int16)
        
        audio_float_back = int16_to_float(audio_int16)
        np.testing.assert_allclose(audio_float, audio_float_back, atol=1e-4)
        print("✅ 位深转换测试通过")
        print("✅ 通过: TC-AP-010: 位深转换")

    def test_peak_normalization(self):
        """
        TC-AP-011: 峰值归一化测试
        
        测试用例编号: TC-AP-011
        测试目的: 验证峰值归一化算法的正确性
        
        峰值归一化是将音频信号的最大幅度缩放到指定目标电平的过程，
        用于确保音频信号的响度一致性和最大化利用动态范围。
        
        归一化公式:
            normalized = audio / max(|audio|) * target_level
        
        测试原理:
            - 输入音频: [1, -2, 0.5] * 0.2 = [0.2, -0.4, 0.1]
            - 最大绝对值: 0.4
            - 目标电平: 0.9
            - 预期输出: [0.45, -0.9, 0.225]
            - 验证: max(|output|) ≈ 0.9
        
        峰值归一化特点:
            1. 保证信号不削波(相对于目标电平)
            2. 保持波形形状不变
            3. 可能导致整体响度变化
            4. 一次性处理，无需迭代
        
        应用场景:
            - 音频出版和广播标准
            - 响度匹配
            - 音频预处理
            - 动态范围控制
        
        目标电平选择:
            - 0dBFS: 1.0 (最大可能值)
            - -3dBFS: ~0.707 (留有裕量)
            - -6dBFS: 0.5 (保守设置)
        
        验证方法:
            使用self.assertAlmostEqual验证归一化后最大绝对值等于目标电平
        
        注意事项:
            - 静音信号(max=0)应保持不变
            - 过大的目标电平可能导致削波
            - 与RMS归一化不同，峰值归一化不保证能量一致
        """
        print("\n============================================================")
        print("TC-AP-011: 测试峰值归一化")
        print("============================================================")

        def normalize_peak(audio, target_level=0.95):
            """峰值归一化
            
            参数:
                audio: 输入音频信号
                target_level: 目标峰值电平，默认0.95
                
            返回:
                峰值归一化后的音频信号
            """
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                return audio / max_val * target_level
            return audio

        audio = np.array([1, -2, 0.5]) * 0.2 # Max abs is 0.4
        normalized = normalize_peak(audio, target_level=0.9)
        self.assertAlmostEqual(np.max(np.abs(normalized)), 0.9)
        print("✅ 峰值归一化测试通过")
        print("✅ 通过: TC-AP-011: 峰值归一化")

    def test_rms_normalization(self):
        """
        TC-AP-012: RMS归一化测试
        
        测试用例编号: TC-AP-012
        测试目的: 验证RMS(均方根)归一化算法的正确性
        
        RMS归一化是根据信号的有效值(RMS)进行幅度缩放的归一化方法，
        与峰值归一化不同，RMS归一化保持信号的能量一致性。
        
        RMS计算公式:
            RMS = sqrt(mean(x^2))
        
        归一化公式:
            normalized = audio / RMS(audio) * target_rms
        
        测试原理:
            - 输入音频: [1, -1, 1, -1] (RMS = 1.0)
            - 目标RMS: 0.2
            - 预期输出: [0.2, -0.2, 0.2, -0.2] (RMS = 0.2)
            - 验证: RMS(output) ≈ 0.2
        
        RMS归一化特点:
            1. 保持信号能量一致性
            2. 不同波形的响度感知相近
            3. 不保证峰值不削波
            4. 适合响度标准化
        
        应用场景:
            - 语音识别预处理
            - 响度标准化
            - 音频对比分析
            - 语音增强
        
        RMS与峰值的关系:
            - 峰值因子(Peak Factor) = Peak / RMS
            - 正弦波: 峰值因子 ≈ 1.414
            - 方波: 峰值因子 = 1
            - 语音: 峰值因子约3-6
        
        验证方法:
            计算归一化后的RMS值，验证等于目标RMS
        
        注意事项:
            - 静音信号(RMS=0)应保持不变
            - 需要根据信号类型选择合适的target_rms
            - RMS归一化后峰值可能超出[-1, 1]范围
        """
        print("\n============================================================")
        print("TC-AP-012: 测试RMS归一化")
        print("============================================================")

        def normalize_rms(audio, target_rms=0.1):
            """RMS归一化
            
            参数:
                audio: 输入音频信号
                target_rms: 目标RMS值，默认0.1
                
            返回:
                RMS归一化后的音频信号
            """
            rms = np.sqrt(np.mean(audio ** 2))
            if rms > 0:
                return audio / rms * target_rms
            return audio

        audio = np.array([1, -1, 1, -1], dtype=np.float32) # RMS is 1.0
        normalized = normalize_rms(audio, target_rms=0.2)
        
        actual_rms = np.sqrt(np.mean(normalized ** 2))
        self.assertAlmostEqual(actual_rms, 0.2)
        print("✅ RMS归一化测试通过")
        print("✅ 通过: TC-AP-012: RMS归一化")

    def test_highpass_filter(self):
        """
        TC-AP-013: 高通滤波器测试
        
        测试用例编号: TC-AP-013
        测试目的: 验证巴特沃斯高通滤波器对低频噪声的抑制效果
        
        高通滤波器允许高频信号通过，同时衰减低频信号，
        常用于去除音频中的低频噪声(如工频干扰、机械振动等)。
        
        滤波器设计:
            - 类型: 巴特沃斯(Butterworth)
            - 阶数: 5阶(5th order)
            - 截止频率: 可配置，默认100Hz
            - 归一化频率: cutoff / nyquist
        
        巴特沃斯特性:
            - 通带平坦，无波纹
            - 过渡带较缓
            - 阶数越高，过渡越陡
        
        测试原理:
            1. 创建合成测试信号:
               - 低频分量: 30Hz正弦波
               - 高频分量: 1000Hz正弦波
            2. 应用100Hz高通滤波器
            3. 验证:
               - 输出总功率 < 输入总功率(低频被衰减)
               - 输出功率 ≈ 原始高频分量功率
        
        截止频率选择:
            - 语音处理: 80-100Hz(去除基频和共振峰以下)
            - 音乐处理: 根据最低音高选择
            - 噪声去除: 根据噪声频率范围选择
        
        应用场景:
            - 去除工频干扰(50/60Hz)
            - 去除机械振动噪声
            - 语音前置处理
            - 去除直流偏移
        
        滤波器实现:
            - 使用scipy.signal.butter设计
            - 使用filtfilt进行零相位滤波(避免相位失真)
            - 输出转换为float32类型
        
        验证方法:
            - 使用self.assertLess验证功率降低
            - 使用self.assertAlmostEqual验证高频保留程度
        
        注意事项:
            - 滤波器存在瞬态响应
            - 边缘数据可能受影响
            - 高阶滤波器可能有更多相位延迟
        """
        print("\n============================================================")
        print("TC-AP-013: 测试高通滤波器")
        print("============================================================")
        
        from scipy import signal

        def highpass_filter(audio, sample_rate, cutoff=80, order=5):
            """应用巴特沃斯高通滤波器
            
            参数:
                audio: 输入音频信号
                sample_rate: 采样率(Hz)
                cutoff: 截止频率(Hz)，默认80Hz
                order: 滤波器阶数，默认5阶
                
            返回:
                滤波后的音频信号
            """
            nyquist = 0.5 * sample_rate
            normal_cutoff = cutoff / nyquist
            b, a = signal.butter(order, normal_cutoff, btype='high', analog=False)
            return signal.filtfilt(b, a, audio).astype(np.float32)

        sample_rate = 16000
        # Create a signal with a low freq (30Hz) and a high freq (1000Hz) component
        t = np.linspace(0, 1, sample_rate, endpoint=False)
        low_freq_signal = np.sin(2 * np.pi * 30 * t)
        high_freq_signal = np.sin(2 * np.pi * 1000 * t)
        audio = low_freq_signal + high_freq_signal
        
        filtered_audio = highpass_filter(audio, sample_rate, cutoff=100)
        
        # The power of the filtered signal should be significantly less than the original total power
        original_power_total = np.mean(audio**2)
        filtered_power_total = np.mean(filtered_audio**2)
        self.assertLess(filtered_power_total, original_power_total)

        # The power of the filtered signal should be close to the power of the original high-frequency component
        power_high_freq_original = np.mean(high_freq_signal**2)
        self.assertAlmostEqual(filtered_power_total, power_high_freq_original, delta=0.1)
        
        print("✅ 高通滤波器测试通过")
        print("✅ 通过: TC-AP-013: 高通滤波器")


if __name__ == '__main__':
    unittest.main()