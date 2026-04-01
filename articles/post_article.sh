#!/bin/bash
# 发布文章到博客系统
# 用法: ./post_article.sh "标题" "正文(换行用\\n)" "标签1,标签2"
# 
# 示例:
#   ./post_article.sh "Go 1.24 新特性解析" $'Go 1.24 带来了...\n\n详细内容...' "Go,编程"

BLOG_API="http://localhost:8080/api"

TITLE="$1"
CONTENT="$2"
TAGS="${3:-技术}"

if [ -z "$TITLE" ] || [ -z "$CONTENT" ]; then
  echo "用法: $0 \"标题\" \"正文\" \"标签1,标签2\""
  exit 1
fi

# 登录
TOKEN=$(curl -s -X POST "$BLOG_API/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

# 构建 JSON（处理多行内容）
PAYLOAD=$(python3 << PYEOF
import json
title = """$TITLE"""
content = """$CONTENT"""
tags_str = """$TAGS"""
tags = [t.strip() for t in tags_str.split(",") if t.strip()]
print(json.dumps({
    "title": title,
    "content": content,
    "tags": tags
}, ensure_ascii=False))
PYEOF
)

# 发布
RESP=$(curl -s -X POST "$BLOG_API/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PAYLOAD")

if echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','?') if isinstance(d,dict) else '?')" 2>/dev/null; then
  echo "✅ 发布成功: $TITLE"
else
  echo "❌ 发布失败: $RESP"
fi
