#!/usr/bin/env python3
"""
活动日志工具 - 记录每日工作内容
用法:
  python3 log_activity.py --category dev --project blog-system --description "修复了目录TOC布局问题"
  python3 log_activity.py --category config --description "配置了开机启动项"
"""
import sqlite3, json, sys, argparse
from datetime import datetime

DB_PATH = "/Users/sct26/projects/blog-system/work-log/work_log.db"

def log_activity(category, description, project=None, details=None):
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now()
    conn.execute("""
        INSERT INTO daily_log (log_date, log_time, category, description, project, details)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), category, description, project, json.dumps(details) if details else None))
    conn.commit()
    conn.close()
    print(f"✅ [{now.strftime('%H:%M:%S')}] [{category}] {description}")

def view_today():
    conn = sqlite3.connect(DB_PATH)
    today = datetime.now().strftime("%Y-%m-%d")
    cur = conn.execute("""
        SELECT log_time, category, description, project 
        FROM daily_log WHERE log_date = ? 
        ORDER BY log_time
    """, (today,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        print("今日暂无记录")
        return
    for r in rows:
        print(f"  {r[0]} [{r[1]}] {r[2]} {'('+r[3]+')' if r[3] else ''}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="工作日志工具")
    parser.add_argument("--category", default="other", help="类别: dev/config/meeting/research/fix/other")
    parser.add_argument("--description", help="描述")
    parser.add_argument("--project", help="项目名")
    parser.add_argument("--details", help="详细信息(JSON)")
    parser.add_argument("--view-today", action="store_true", help="查看今日记录")
    args = parser.parse_args()
    
    if args.view_today:
        view_today()
    elif args.description:
        log_activity(args.category, args.description, args.project, args.details)
    else:
        parser.print_help()
