#!/usr/bin/env python3
"""
anti-ai-check.py — 文章去AI味检查工具
用法: python3 anti-ai-check.py "文章标题" "文章正文"

返回检查结果，标注需要修改的地方
"""

import sys
import re

# AI 味高频词汇
AI_WORDS = [
    "delve", "tapestry", "intricate", "intricacies", "meticulous", "meticulously",
    "pivotal", "vibrant", "testament", "interplay", "garner", "landscape",
    "Additionally", "valuable", "boasts", "bolstered", "enduring", "crucial",
    "align with", "fostering", "enhance", "showcasing", "highlighting",
    "underscore", "emphasizing", "nestled", "groundbreaking", "renowned",
    "diverse array", "rich", "profound", "exemplifies", "commitment to",
    "natural beauty", "enhancing", "boasts a", "valuable insights",
    "ensuring", "reflecting", "symbolizing", "contributing to", "cultivating",
    "encompassing", "resonating with", "fostering",
    "services as", "serves as the", "highlighting the",
    "a pivotal moment", "a significant shift", "setting the stage",
    "reflects broader trends", "underscores the importance",
]

# 结构性 AI 模式
PATTERNS = [
    (re.compile(r'\bIt\'s not just about .+?— it\'s about\b', re.I), '"Not Just X, But Y" 公式'),
    (re.compile(r'Not only.+?but also', re.I), '"Not Only...But Also" 公式'),
    (re.compile(r'Despite its .+?, .+? faces', re.I), '"Despite Challenges" 公式'),
    (re.compile(r'marking a pivotal moment', re.I), '显著性夸大'),
    (re.compile(r'represents a significant shift', re.I), '显著性夸大'),
    (re.compile(r'setting the stage for', re.I), '显著性夸大'),
    (re.compile(r'reflects broader trends', re.I), '显著性夸大'),
    (re.compile(r'\bfrom .+? to .+? and .+?\b', re.I), '虚假范围（堆砌式列举）'),
    (re.compile(r'\w+ing,\s+\w+ing,\s+\w+ing', re.I), '三重并列结构'),
    (re.compile(r'Experts? (say|argue|note|believe)', re.I), '模糊归属（专家说）'),
    (re.compile(r'Industry reports? (suggest|show|indicate)', re.I), '模糊归属（行业报告）'),
    (re.compile(r'Several sources? (say|indicate)', re.I), '模糊归属（多个来源）'),
]

def check(title, content):
    text = title + " " + content
    issues = []

    # 检查 AI 词汇（统计出现次数）
    word_counts = {}
    for word in AI_WORDS:
        # 单词边界匹配
        pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.I)
        matches = pattern.findall(text)
        if matches:
            word_counts[word] = len(matches)

    # 检查结构性模式
    pattern_issues = []
    for pattern, label in PATTERNS:
        matches = pattern.findall(text)
        if matches:
            pattern_issues.append((label, matches[:3]))  # 最多显示3处

    # 检查标题大小写（AI 倾向 Title Case）
    title_words = title.split()
    title_case_count = sum(1 for w in title_words if w[0].isupper() and w[1:].islower() and len(w) > 1)
    if title_case_count > len(title_words) * 0.5:
        issues.append("⚠️ 标题可能过于正式（AI 倾向 Title Case），考虑用更多小写")

    # 输出结果
    print("=" * 50)
    print("🤖 AI 味检查报告")
    print("=" * 50)

    if not word_counts and not pattern_issues:
        print("✅ 没有检测到明显的 AI 味")
        return True

    if word_counts:
        print("\n🔍 AI 高频词汇（越多越 AI 味）：")
        sorted_words = sorted(word_counts.items(), key=lambda x: -x[1])
        for word, count in sorted_words:
            print(f"  「{word}」出现 {count} 次")

    if pattern_issues:
        print("\n🔍 结构性 AI 模式：")
        for label, matches in pattern_issues:
            print(f"  ⚠️ {label}:")
            for m in matches:
                print(f"     → {m[:80]}")

    print("\n💡 修改建议：")
    if word_counts:
        top_words = [w for w, _ in sorted_words[:5]]
        print(f"  减少以下词汇的使用：{', '.join(top_words)}")
    print("  用简单动词替换复杂动词（has/do/is > boasts/serves as/showcases）")
    print("  句子写完就直接结束，不要加 '...（补充说明）' 式的分析")
    print("  人名重复使用，不用同义词替换")

    return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python3 anti-ai-check.py \"标题\" \"正文\"")
        sys.exit(1)

    title = sys.argv[1]
    content = sys.argv[2]

    ok = check(title, content)
    sys.exit(0 if ok else 1)
