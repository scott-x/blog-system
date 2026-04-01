#!/usr/bin/env python3
"""
每日养生小技巧发送脚本
- 每次选2-3条7天内未发送过的tip
- 写入 pending 文件，由 agent 发送
- 发送后更新 last_sent_at
"""
import sqlite3, json, os
from datetime import datetime, timedelta

DB_PATH = "/Users/sct26/projects/blog-system/health-tips/tips.db"
PENDING_PATH = "/tmp/health_tip_pending.json"
NUM_TIPS = 3

def get_random_tips(n=3):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 优先选7天内未发送过的
    cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    cur.execute("""
        SELECT id, tip, category FROM health_tips
        WHERE last_sent_at IS NULL OR last_sent_at < ?
        ORDER BY RANDOM() LIMIT ?
    """, (cutoff, n))
    rows = cur.fetchall()
    
    if len(rows) < n:
        # 不够就选任意的重置时间最久的
        cur.execute("""
            SELECT id, tip, category FROM health_tips
            ORDER BY last_sent_at ASC NULLS FIRST LIMIT ?
        """, (n - len(rows),))
        rows += cur.fetchall()
    
    conn.close()
    return rows

def main():
    rows = get_random_tips(NUM_TIPS)
    if not rows:
        print("❌ 没有可用的小技巧")
        return
    
    # 更新发送时间
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for r in rows:
        conn.execute("UPDATE health_tips SET last_sent_at = ? WHERE id = ?", (now, r[0]))
    conn.commit()
    conn.close()
    
    hour = datetime.now().hour
    greeting = "☀️ 早安！今日养生小贴士" if hour < 12 else "🌙 晚安！今日养生小贴士"
    
    tips_text = "\n\n".join([f"📌 {r[1]}\n   🏷️ {r[2]}" for r in rows])
    message = f"""{greeting}

{tips_text}

💡 回复「采纳」可保存到收藏夹"""

    pending = {
        "tips": [{"id": r[0], "tip": r[1], "category": r[2]} for r in rows],
        "message": message,
        "at": now,
        "sent": False
    }
    
    with open(PENDING_PATH, "w") as f:
        json.dump(pending, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 待发送 {len(rows)} 条 tip")
    for r in rows:
        print(f"   [{r[0]}] {r[1][:40]}...")

if __name__ == "__main__":
    main()
