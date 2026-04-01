#!/bin/bash
# 文章写作与发布脚本
# 用法: ./write_article.sh [topic_index]
# 不带参数运行：从选题库选取下一个话题，写500+字文章并发布

BLOG_API="http://localhost:8080/api"
ARTICLES_DIR="/Users/sct26/projects/blog-system/articles"
IDEAS_FILE="$ARTICLES_DIR/article_ideas.md"
TRACKING_FILE="$ARTICLES_DIR/published_articles.json"
COUNTER_FILE="$ARTICLES_DIR/.counter"

# 登录获取 Token
TOKEN=$(curl -s -X POST "$BLOG_API/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "登录失败"
  exit 1
fi

# 读取选题（跳过标题和已完成的行）
pick_topic() {
  python3 << 'PYEOF'
import re, json, sys, os
from datetime import datetime

ideas_file = "/Users/sct26/projects/blog-system/articles/article_ideas.md"
tracking_file = "/Users/sct26/projects/blog-system/articles/published_articles.json"

with open(ideas_file, "r") as f:
    lines = f.readlines()

topics = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    if line.startswith("## ") and "已发布" not in line:
        category = line.replace("## ", "").strip()
        i += 1
        while i < len(lines):
            item = lines[i].strip()
            if item.startswith("## ") or item.startswith("#"):
                break
            if item.startswith("- [ ]"):
                topic = item.replace("- [ ]", "").strip()
                topics.append((category, topic))
            i += 1
    else:
        i += 1

# 加载已发布记录
published = {}
if os.path.exists(tracking_file):
    with open(tracking_file) as f:
        published = json.load(f)

# 过滤掉今天已发布的
today = datetime.now().strftime("%Y-%m-%d")
available = [t for t in topics if t[1] not in published.get(today, [])]

if not available:
    # 随机选一个
    import random
    selected = random.choice(topics)
else:
    selected = available[0]

print(f"{selected[0]}|{selected[1]}")
PYEOF
}

# 主流程
TOPIC_INFO=$(pick_topic)
CATEGORY=$(echo "$TOPIC_INFO" | cut -d'|' -f1)
TOPIC=$(echo "$TOPIC_INFO" | cut -d'|' -f2)

echo "正在写作: [$CATEGORY] $TOPIC"

# 这里留空，实际写作由 agent 填充
# 脚本负责：发布文章到博客系统

# 发布函数
post_article() {
  local title="$1"
  local content="$2"
  local tags="${3:-技术}"

  RESP=$(curl -s -X POST "$BLOG_API/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$(python3 -c "
import json
print(json.dumps({
    'title': '''$title''',
    'content': '''$content''',
    'tags': ['''$tags''']
}))
" 2>/dev/null)")

  echo "$RESP"
}

echo "TOPIC_CATEGORY=$CATEGORY"
echo "TOPIC_TITLE=$TOPIC"

# ── Markdown 代码块规范 ──
# 所有代码必须使用语言标记：
#   ```go
#   ```javascript
#   ```bash
#   ```dockerfile
#   ```python
#   ```sql
#   ```yaml
# 不允许裸代码行（无```包裹的代码片段视为脏数据）
