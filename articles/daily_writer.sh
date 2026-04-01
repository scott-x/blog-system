#!/bin/bash
# 每日写作提醒脚本
# 每天 09:00 检查是否已发布今日3篇文章，未满则发飞书提醒
# 由 launchd 调用

DB_DIR="/Users/sct26/projects/blog-system/articles"
TOKEN_FILE="/tmp/blog_token_$$"

# 获取 token
TOKEN=$(curl -s -X POST "http://localhost:8080/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "登录失败，跳过"
  exit 1
fi

# 检查今天已发布数量
TODAY=$(date +%Y-%m-%d)
COUNT=$(curl -s "http://localhost:8080/api/posts?page=1&page_size=100" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "
import sys,json
d=json.load(sys.stdin)
today='$(date +%Y-%m-%d)'
count=0
for p in d.get('posts',[]):
    if today in p.get('created_at','') and count < 10:
        count+=1
print(count)
" 2>/dev/null)

NEED=$((3 - COUNT))
if [ "$NEED" -gt "0" ]; then
  MSG="📝 博客写作提醒：今日已发布 ${COUNT}/3 篇文章，还差 ${NEED} 篇。选题库：~/projects/blog-system/articles/article_ideas.md"
  echo "$MSG"
  # 写提醒文件供后续处理
  echo "$MSG" > /tmp/article_reminder_$(date +%Y%m%d)
fi
