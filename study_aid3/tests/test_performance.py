import unittest
import os
import time
import subprocess
import psutil
import threading

class TestPerformance(unittest.TestCase):
    def test_recognition_latency(self):
        """TC-PERF-001: 识别延迟测试"""
        print("=== 识别延迟测试 ===")
        base_dir = os.path.dirname(os.path.dirname(__file__))
        audio_path = os.path.join(base_dir, "tests", "hello_world.wav")
        exe_path = os.path.join(base_dir, 'whisper_cpp', 'main.exe')
        model_path = os.path.join(base_dir, 'whisper_cpp', 'ggml-base.en.bin')

        self.assertTrue(os.path.exists(audio_path), "基准音频文件 'hello_world.wav' 不存在")

        command = [
            exe_path,
            "-m", model_path,
            "-f", audio_path,
            "-otxt"
        ]

        log_path = os.path.join(base_dir, "whisper_log.txt")
        with open(log_path, "a", encoding='utf-8') as log_file:
            start_time = time.time()
            result = subprocess.run(command, cwd=base_dir, stdout=log_file, stderr=subprocess.STDOUT)
            end_time = time.time()

        latency = end_time - start_time
        print(f"  识别延迟: {latency:.4f} 秒")

        if result.returncode != 0:
            print(f"  Whisper.cpp process failed. See {log_path} for details.")
        
        output_txt_path = audio_path + ".txt"
        self.assertTrue(os.path.exists(output_txt_path), "输出的文本文件不存在")

        with open(output_txt_path, 'r', encoding='utf-8') as f:
            result_text = f.read().strip()
        
        print(f"  识别结果: {result_text}")
        os.remove(output_txt_path)

        # 预期延迟在 5 秒以内
        self.assertLess(latency, 5, f"识别延迟过高: {latency:.4f} 秒")
        self.assertIn("hello", result_text.lower())
        print("\n识别延迟测试通过")

    def test_resource_usage(self):
        """TC-PERF-002: CPU与内存占用测试"""
        print("\n=== CPU与内存占用测试 ===")
        base_dir = os.path.dirname(os.path.dirname(__file__))
        audio_path = os.path.join(base_dir, "tests", "hello_world.wav")
        exe_path = os.path.join(base_dir, 'whisper_cpp', 'main.exe')
        model_path = os.path.join(base_dir, 'whisper_cpp', 'ggml-base.en.bin')

        command = [
            exe_path,
            "-m", model_path,
            "-f", audio_path,
            "-otxt"
        ]

        cpu_usage = []
        mem_usage = []
        monitor_active = True

        def monitor_process(pid):
            try:
                proc = psutil.Process(pid)
                while monitor_active:
                    cpu_usage.append(proc.cpu_percent(interval=0.1))
                    mem_usage.append(proc.memory_info().rss / (1024 * 1024)) # in MB
            except psutil.NoSuchProcess:
                pass

        log_path = os.path.join(base_dir, "whisper_log.txt")
        with open(log_path, "a", encoding='utf-8') as log_file:
            process = subprocess.Popen(command, cwd=base_dir, stdout=log_file, stderr=subprocess.STDOUT)
            
            monitor_thread = threading.Thread(target=monitor_process, args=(process.pid,))
            monitor_thread.start()

            process.communicate() # Properly close pipes
            monitor_active = False
            monitor_thread.join()

        output_txt_path = audio_path + ".txt"
        os.remove(output_txt_path)

        if cpu_usage and mem_usage:
            peak_cpu = max(cpu_usage)
            avg_cpu = sum(cpu_usage) / len(cpu_usage)
            peak_mem = max(mem_usage)
            avg_mem = sum(mem_usage) / len(mem_usage)

            print(f"  CPU 使用率 (%): 峰值={peak_cpu:.2f}, 平均={avg_cpu:.2f}")
            print(f"  内存使用 (MB): 峰值={peak_mem:.2f}, 平均={avg_mem:.2f}")

            # 预期平均内存 < 600MB
            self.assertLess(avg_mem, 600, "平均内存占用过高")
            print("\nCPU与内存占用测试通过")
        else:
            self.fail("未能收集到资源使用数据")

if __name__ == '__main__':
    unittest.main()