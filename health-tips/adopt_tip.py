#!/usr/bin/env python3
"""
用户回复「采纳」时调用此脚本，保存当前tip到已采纳列表
"""
import sqlite3, json, os
from datetime import datetime

DB_PATH = "/Users/sct26/projects/blog-system/health-tips/tips.db"
PENDING_PATH = "/tmp/health_tip_pending.json"
ADOPTED_PATH = "/Users/sct26/projects/blog-system/health-tips/adopted_tips.json"

def adopt():
    if not os.path.exists(PENDING_PATH):
        print("❌ 没有待采纳的tip")
        return False
    
    with open(PENDING_PATH) as f:
        pending = json.load(f)
    
    tip_id = pending.get("id")
    tip_text = pending.get("tip", "")
    category = pending.get("category", "")
    saved_at = pending.get("at", datetime.now().isoformat())
    
    # 保存到JSON持久化
    adopted = []
    if os.path.exists(ADOPTED_PATH):
        with open(ADOPTED_PATH) as f:
            adopted = json.load(f)
    
    # 避免重复采纳
    if any(t.get("id") == tip_id for t in adopted):
        print(f"⚠️ tip {tip_id} 已采纳过")
        return True
    
    adopted.insert(0, {
        "id": tip_id,
        "tip": tip_text,
        "category": category,
        "adopted_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    })
    
    with open(ADOPTED_PATH, "w") as f:
        json.dump(adopted, f, ensure_ascii=False, indent=2)
    
    # 标记到数据库
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT OR IGNORE INTO adopted_tips (tip_id, adopted_at) VALUES (?, datetime('now', 'localtime'))", (tip_id,))
    conn.commit()
    conn.close()
    
    # 删除pending
    os.remove(PENDING_PATH)
    
    print(f"✅ 已采纳并保存: {tip_text[:30]}...")
    return True

if __name__ == "__main__":
    adopt()
