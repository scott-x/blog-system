#!/bin/bash
# 发送每日健康小技巧
# 使用 agent 直接发送，不需要额外 API

TIPS_DB="/Users/sct26/projects/blog-system/health-tips/tips.db"
ADOPTED_DB="/Users/sct26/projects/blog-system/health-tips/adopted_tips.json"
SESSION_KEY="main"

# 获取一条随机未推送过的tip
TIP=$(sqlite3 "$TIPS_DB" "
    SELECT id, tip, category FROM health_tips 
    WHERE id NOT IN (
        SELECT tip_id FROM adopted_tips WHERE adopted=1
    )
    ORDER BY RANDOM() LIMIT 1
")

if [ -z "$TIP" ]; then
    # 所有tip都用过了，重置
    sqlite3 "$TIPS_DB" "UPDATE adopted_tips SET adopted=0;"
    TIP=$(sqlite3 "$TIPS_DB" "
        SELECT id, tip, category FROM health_tips 
        ORDER BY RANDOM() LIMIT 1
    ")
fi

ID=$(echo "$TIP" | awk -F'|' '{print $1}')
TEXT=$(echo "$TIP" | awk -F'|' '{print $2}')
CATEGORY=$(echo "$TIP" | awk -F'|' '{print $3}')

HOUR=$(date +%H)
if [ "$HOUR" -lt 12 ]; then
    TIME_TEXT="早安 ☀️ 养生小贴士"
else
    TIME_TEXT="晚安 🌙 养生小贴士"
fi

MESSAGE="【${TIME_TEXT}】

📌 ${TEXT}

🏷️ #${CATEGORY}

💡 回复「采纳」可保存到收藏夹"

echo "Sending tip ID=$ID"
echo "Content: $TEXT"
echo "Category: $CATEGORY"

# 通过 sessions_send 发送给主 session
osascript -e "
tell application \"System Events\"
    keystroke \"/exec echo '$MESSAGE' > /tmp/health_tip_$ID.txt\"
end tell
" 2>/dev/null

# 保存到临时文件供后续处理
echo "{\"id\":$ID,\"tip\":\"$TEXT\",\"category\":\"$CATEGORY\",\"saved_at\":\"$(date '+%Y-%m-%d %H:%M')\"}" > /tmp/health_tip_pending.json
echo "✅ 发送准备完成"
