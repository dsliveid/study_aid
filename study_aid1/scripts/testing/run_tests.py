#!/usr/bin/env python3
"""
自动化测试执行脚本
Automated Test Execution Script for Desktop Learning Assistant

功能:
1. 执行Python单元测试
2. 生成测试报告
3. 检查代码覆盖率
4. 输出测试结果摘要

使用方法:
    python run_tests.py [选项]

选项:
    --service     指定要测试的服务 (speech|screenshot|image|ai|updater|all)
    --coverage    生成覆盖率报告
    --html        生成HTML报告
    --xml         生成JUnit XML报告
    --verbose     详细输出
    --failfast    遇到第一个失败时停止
"""

import argparse
import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional


# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent
TESTS_DIR = PROJECT_ROOT / "tests" / "python"
REPORTS_DIR = PROJECT_ROOT / "tests" / "reports"

# 服务到测试文件的映射
SERVICE_TEST_MAP = {
    "speech": "test_speech_recognition.py",
    "screenshot": "test_screenshot.py",
    "image": "test_image_recognition.py",
    "ai": "test_ai_content.py",
    "updater": "test_updater.py",
    "all": None  # 执行所有测试
}


def setup_directories():
    """创建必要的目录结构."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "html").mkdir(exist_ok=True)
    (REPORTS_DIR / "xml").mkdir(exist_ok=True)
    (REPORTS_DIR / "coverage").mkdir(exist_ok=True)


def check_dependencies() -> bool:
    """检查测试依赖是否已安装."""
    try:
        import pytest
        import pytest_asyncio
        return True
    except ImportError:
        print("错误: 测试依赖未安装。请运行: pip install -r tests/python/requirements.txt")
        return False


def build_pytest_args(
    service: str = "all",
    coverage: bool = False,
    html: bool = False,
    xml: bool = False,
    verbose: bool = False,
    failfast: bool = False
) -> List[str]:
    """构建pytest命令行参数."""
    args = ["pytest"]

    # 测试文件或目录
    if service == "all" or service not in SERVICE_TEST_MAP:
        args.append(str(TESTS_DIR))
    else:
        test_file = TESTS_DIR / SERVICE_TEST_MAP[service]
        if test_file.exists():
            args.append(str(test_file))
        else:
            print(f"错误: 测试文件不存在: {test_file}")
            sys.exit(1)

    # 覆盖率
    if coverage:
        args.extend([
            "--cov=src",
            "--cov-report=term-missing",
            f"--cov-report=html:{REPORTS_DIR / 'coverage' / 'html'}",
            f"--cov-report=xml:{REPORTS_DIR / 'coverage' / 'coverage.xml'}"
        ])

    # HTML报告
    if html:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_report = REPORTS_DIR / "html" / f"report_{timestamp}.html"
        args.extend([f"--html={html_report}", "--self-contained-html"])

    # JUnit XML报告
    if xml:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        xml_report = REPORTS_DIR / "xml" / f"report_{timestamp}.xml"
        args.extend([f"--junitxml={xml_report}"])

    # 详细输出
    if verbose:
        args.append("-v")
    else:
        args.append("-v")  # 默认详细输出

    # 遇到失败停止
    if failfast:
        args.append("-x")

    # 其他常用选项
    args.extend([
        "--tb=short",  # 简短的traceback
        "--strict-markers",  # 严格的marker检查
        "--disable-warnings"  # 禁用警告
    ])

    return args


def run_tests(args: List[str]) -> int:
    """执行测试并返回退出码."""
    print("=" * 60)
    print("桌面学习助手 - 自动化测试执行")
    print("=" * 60)
    print(f"\n执行命令: {' '.join(args)}\n")

    try:
        result = subprocess.run(args, cwd=PROJECT_ROOT)
        return result.returncode
    except FileNotFoundError:
        print("错误: pytest 未安装。请运行: pip install pytest")
        return 1
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        return 130


def generate_summary(returncode: int, service: str) -> None:
    """生成测试摘要."""
    print("\n" + "=" * 60)
    print("测试执行摘要")
    print("=" * 60)

    print(f"\n测试服务: {service}")
    print(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"测试结果: {'通过' if returncode == 0 else '失败'}")

    if returncode == 0:
        print("\n✅ 所有测试通过!")
    elif returncode == 5:
        print("\n⚠️  没有找到测试")
    else:
        print(f"\n❌ 测试失败 (退出码: {returncode})")

    # 显示报告位置
    print(f"\n报告位置:")
    print(f"  - HTML报告: {REPORTS_DIR / 'html'}")
    print(f"  - XML报告: {REPORTS_DIR / 'xml'}")
    print(f"  - 覆盖率报告: {REPORTS_DIR / 'coverage'}")


def main():
    """主函数."""
    parser = argparse.ArgumentParser(
        description="桌面学习助手自动化测试执行脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 运行所有测试
  python run_tests.py

  # 运行特定服务测试
  python run_tests.py --service speech

  # 生成覆盖率报告
  python run_tests.py --coverage

  # 生成所有报告
  python run_tests.py --coverage --html --xml

  # 详细输出并遇到失败停止
  python run_tests.py --verbose --failfast
        """
    )

    parser.add_argument(
        "--service",
        choices=list(SERVICE_TEST_MAP.keys()),
        default="all",
        help="要测试的服务 (默认: all)"
    )
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="生成覆盖率报告"
    )
    parser.add_argument(
        "--html",
        action="store_true",
        help="生成HTML测试报告"
    )
    parser.add_argument(
        "--xml",
        action="store_true",
        help="生成JUnit XML报告"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="详细输出"
    )
    parser.add_argument(
        "--failfast", "-x",
        action="store_true",
        help="遇到第一个失败时停止"
    )

    args = parser.parse_args()

    # 设置目录
    setup_directories()

    # 检查依赖
    if not check_dependencies():
        sys.exit(1)

    # 构建命令
    pytest_args = build_pytest_args(
        service=args.service,
        coverage=args.coverage,
        html=args.html,
        xml=args.xml,
        verbose=args.verbose,
        failfast=args.failfast
    )

    # 执行测试
    returncode = run_tests(pytest_args)

    # 生成摘要
    generate_summary(returncode, args.service)

    sys.exit(returncode)


if __name__ == "__main__":
    main()
