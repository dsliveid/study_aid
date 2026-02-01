#!/usr/bin/env python3
"""
缺陷报告生成脚本
Bug Report Generation Script for Desktop Learning Assistant

功能:
1. 从测试结果中提取失败用例
2. 生成标准化的缺陷报告
3. 支持Markdown和JSON格式输出
4. 自动分配缺陷ID

使用方法:
    python generate_bug_report.py [选项]

选项:
    --input       测试结果文件路径 (XML或JSON)
    --output      输出文件路径
    --format      输出格式 (markdown|json)
    --service     相关服务名称
    --auto-id     自动分配缺陷ID
"""

import argparse
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import re


# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent
BUG_REPORTS_DIR = PROJECT_ROOT / "docs" / "bug_reports"

# 缺陷ID计数器文件
BUG_ID_FILE = BUG_REPORTS_DIR / ".bug_id_counter"

# 服务到模块名称的映射
SERVICE_MODULE_MAP = {
    "speech": "语音识别服务",
    "screenshot": "截图服务",
    "image": "图像识别服务",
    "ai": "AI内容生成服务",
    "updater": "自动更新服务"
}


def setup_directories():
    """创建必要的目录结构."""
    BUG_REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_next_bug_id() -> str:
    """获取下一个缺陷ID."""
    today = datetime.now().strftime("%Y%m%d")

    if BUG_ID_FILE.exists():
        with open(BUG_ID_FILE, "r") as f:
            last_id = f.read().strip()
            if last_id.startswith(f"BUG-{today}"):
                try:
                    counter = int(last_id.split("-")[-1])
                    next_counter = counter + 1
                except ValueError:
                    next_counter = 1
            else:
                next_counter = 1
    else:
        next_counter = 1

    bug_id = f"BUG-{today}-{next_counter:03d}"

    # 保存新的计数器
    with open(BUG_ID_FILE, "w") as f:
        f.write(bug_id)

    return bug_id


def parse_junit_xml(xml_path: Path) -> List[Dict[str, Any]]:
    """解析JUnit XML测试报告."""
    failures = []

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()

        # 处理testsuites或testsuite根元素
        if root.tag == "testsuites":
            test_suites = root.findall("testsuite")
        else:
            test_suites = [root]

        for suite in test_suites:
            for testcase in suite.findall("testcase"):
                failure = testcase.find("failure")
                error = testcase.find("error")

                if failure is not None or error is not None:
                    failure_elem = failure if failure is not None else error

                    failure_info = {
                        "test_class": testcase.get("classname", ""),
                        "test_name": testcase.get("name", ""),
                        "time": float(testcase.get("time", 0)),
                        "type": failure_elem.get("type", ""),
                        "message": failure_elem.get("message", ""),
                        "details": failure_elem.text or ""
                    }
                    failures.append(failure_info)

    except ET.ParseError as e:
        print(f"错误: 无法解析XML文件: {e}")
    except FileNotFoundError:
        print(f"错误: 文件不存在: {xml_path}")

    return failures


def parse_pytest_json(json_path: Path) -> List[Dict[str, Any]]:
    """解析pytest JSON报告."""
    failures = []

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for test in data.get("tests", []):
            if test.get("outcome") == "failed":
                failure_info = {
                    "test_class": test.get("nodeid", "").split("::")[0],
                    "test_name": test.get("nodeid", "").split("::")[-1],
                    "time": test.get("duration", 0),
                    "type": "AssertionError",
                    "message": test.get("call", {}).get("longrepr", ""),
                    "details": ""
                }
                failures.append(failure_info)

    except json.JSONDecodeError as e:
        print(f"错误: 无法解析JSON文件: {e}")
    except FileNotFoundError:
        print(f"错误: 文件不存在: {json_path}")

    return failures


def determine_severity(test_name: str, error_message: str) -> str:
    """根据测试名称和错误信息确定缺陷严重级别."""

    # P0 - 致命缺陷关键词
    p0_keywords = ["crash", "fatal", "error_handling", "config_invalid", "auth_failed"]

    # P1 - 严重缺陷关键词
    p1_keywords = ["core", "main", "primary", "critical"]

    lower_name = test_name.lower()
    lower_msg = error_message.lower()

    for keyword in p0_keywords:
        if keyword in lower_name or keyword in lower_msg:
            return "P0"

    for keyword in p1_keywords:
        if keyword in lower_name or keyword in lower_msg:
            return "P1"

    # 默认P2
    return "P2"


def determine_module(test_class: str) -> str:
    """根据测试类名确定所属模块."""
    lower_class = test_class.lower()

    if "speech" in lower_class:
        return "语音识别服务"
    elif "screenshot" in lower_class:
        return "截图服务"
    elif "image" in lower_class:
        return "图像识别服务"
    elif "ai" in lower_class or "content" in lower_class:
        return "AI内容生成服务"
    elif "updater" in lower_class or "update" in lower_class:
        return "自动更新服务"
    else:
        return "未知模块"


def generate_markdown_report(
    failures: List[Dict[str, Any]],
    service: Optional[str] = None,
    auto_id: bool = True
) -> str:
    """生成Markdown格式的缺陷报告."""

    report_lines = [
        "# 缺陷报告",
        "",
        f"**生成日期**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"**发现失败的测试**: {len(failures)}",
        "",
        "---",
        ""
    ]

    for i, failure in enumerate(failures, 1):
        bug_id = get_next_bug_id() if auto_id else f"BUG-TBD-{i:03d}"
        severity = determine_severity(failure["test_name"], failure["message"])
        module = determine_module(failure["test_class"])

        if service and service in SERVICE_MODULE_MAP:
            module = SERVICE_MODULE_MAP[service]

        report_lines.extend([
            f"## 缺陷 {i}: {bug_id}",
            "",
            "### 基本信息",
            f"- **缺陷ID**: {bug_id}",
            f"- **标题**: 测试失败 - {failure['test_name']}",
            f"- **所属模块**: {module}",
            f"- **严重级别**: {severity}",
            f"- **优先级**: {'高' if severity in ['P0', 'P1'] else '中'}",
            f"- **报告日期**: {datetime.now().strftime('%Y-%m-%d')}",
            "",
            "### 缺陷描述",
            f"测试用例 `{failure['test_name']}` 执行失败。",
            "",
            "### 测试信息",
            f"- **测试类**: `{failure['test_class']}`",
            f"- **测试方法**: `{failure['test_name']}`",
            f"- **执行时间**: {failure['time']:.3f}s",
            "",
            "### 错误信息",
            "```",
            f"类型: {failure['type']}",
            f"消息: {failure['message']}",
            "```",
            "",
        ])

        if failure["details"]:
            report_lines.extend([
                "### 详细信息",
                "```",
                failure["details"][:2000],  # 限制长度
                "```",
                ""
            ])

        report_lines.extend([
            "### 预期结果",
            "测试应该成功通过。",
            "",
            "### 实际结果",
            "测试执行失败，抛出异常。",
            "",
            "### 复现步骤",
            f"1. 运行测试: `{failure['test_class']}::{failure['test_name']}`",
            "2. 观察测试结果",
            "",
            "### 处理记录",
            "- **确认人**: ",
            "- **分配给谁**: ",
            "- **状态**: 新建",
            "",
            "---",
            ""
        ])

    return "\n".join(report_lines)


def generate_json_report(
    failures: List[Dict[str, Any]],
    service: Optional[str] = None,
    auto_id: bool = True
) -> str:
    """生成JSON格式的缺陷报告."""

    bugs = []

    for i, failure in enumerate(failures, 1):
        bug_id = get_next_bug_id() if auto_id else f"BUG-TBD-{i:03d}"
        severity = determine_severity(failure["test_name"], failure["message"])
        module = determine_module(failure["test_class"])

        if service and service in SERVICE_MODULE_MAP:
            module = SERVICE_MODULE_MAP[service]

        bug = {
            "bug_id": bug_id,
            "title": f"测试失败 - {failure['test_name']}",
            "module": module,
            "severity": severity,
            "priority": "高" if severity in ["P0", "P1"] else "中",
            "report_date": datetime.now().strftime("%Y-%m-%d"),
            "description": f"测试用例 `{failure['test_name']}` 执行失败。",
            "test_info": {
                "test_class": failure["test_class"],
                "test_name": failure["test_name"],
                "execution_time": failure["time"]
            },
            "error_info": {
                "type": failure["type"],
                "message": failure["message"],
                "details": failure["details"][:2000] if failure["details"] else ""
            },
            "status": "新建",
            "reproduction_steps": [
                f"运行测试: {failure['test_class']}::{failure['test_name']}",
                "观察测试结果"
            ]
        }

        bugs.append(bug)

    report = {
        "report_metadata": {
            "generated_at": datetime.now().isoformat(),
            "total_failures": len(failures),
            "format_version": "1.0"
        },
        "bugs": bugs
    }

    return json.dumps(report, ensure_ascii=False, indent=2)


def main():
    """主函数."""
    parser = argparse.ArgumentParser(
        description="桌面学习助手缺陷报告生成脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 从JUnit XML生成缺陷报告
  python generate_bug_report.py --input test-results.xml --format markdown

  # 从JSON报告生成并指定服务
  python generate_bug_report.py --input report.json --service speech --format json

  # 生成报告到指定文件
  python generate_bug_report.py --input results.xml --output bugs.md --format markdown
        """
    )

    parser.add_argument(
        "--input", "-i",
        type=Path,
        required=True,
        help="测试结果文件路径 (XML或JSON)"
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        help="输出文件路径 (默认: 自动生成)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["markdown", "json"],
        default="markdown",
        help="输出格式 (默认: markdown)"
    )
    parser.add_argument(
        "--service", "-s",
        choices=list(SERVICE_MODULE_MAP.keys()),
        help="相关服务名称"
    )
    parser.add_argument(
        "--auto-id",
        action="store_true",
        default=True,
        help="自动分配缺陷ID (默认: True)"
    )
    parser.add_argument(
        "--no-auto-id",
        action="store_true",
        help="不自动分配缺陷ID"
    )

    args = parser.parse_args()

    # 设置目录
    setup_directories()

    # 检查输入文件
    if not args.input.exists():
        print(f"错误: 输入文件不存在: {args.input}")
        return 1

    # 解析测试结果
    suffix = args.input.suffix.lower()

    if suffix == ".xml":
        failures = parse_junit_xml(args.input)
    elif suffix == ".json":
        failures = parse_pytest_json(args.input)
    else:
        print(f"错误: 不支持的文件格式: {suffix}")
        print("支持的格式: .xml (JUnit), .json (pytest)")
        return 1

    if not failures:
        print("没有发现失败的测试!")
        return 0

    print(f"发现 {len(failures)} 个失败的测试")

    # 确定是否自动分配ID
    auto_id = args.auto_id and not args.no_auto_id

    # 生成报告
    if args.format == "markdown":
        report = generate_markdown_report(failures, args.service, auto_id)
        default_ext = ".md"
    else:
        report = generate_json_report(failures, args.service, auto_id)
        default_ext = ".json"

    # 确定输出文件
    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = BUG_REPORTS_DIR / f"bug_report_{timestamp}{default_ext}"

    # 写入报告
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"\n缺陷报告已生成: {output_path}")
    print(f"共生成 {len(failures)} 个缺陷条目")

    return 0


if __name__ == "__main__":
    sys.exit(main())
