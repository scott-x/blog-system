#!/usr/bin/env python3
"""
工作报表生成脚本
- 生成日报/周报/月报
- 查询数据库汇总活动
"""
import sqlite3, json
from datetime import datetime, timedelta

DB_PATH = "/Users/sct26/projects/blog-system/work-log/work_log.db"
PENDING_PATH = "/tmp/work_report_pending.json"

def get_daily_report(date=None):
    """生成日报"""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute("""
        SELECT log_time, category, description, project, details 
        FROM daily_log WHERE log_date = ?
        ORDER BY log_time
    """, (date,))
    rows = cur.fetchall()
    conn.close()
    
    if not rows:
        return None, f"{date} 无工作记录"
    
    # 按分类统计
    categories = {}
    projects = {}
    for r in rows:
        cat = r[1]
        proj = r[3] or "通用"
        categories[cat] = categories.get(cat, 0) + 1
        projects[proj] = projects.get(proj, 0) + 1
    
    # 格式化详情
    lines = []
    for r in rows:
        detail = ""
        if r[4]:
            try:
                d = json.loads(r[4])
                detail = f" → {d.get('summary', '')}"
            except:
                pass
        lines.append(f"• {r[0]} [{r[1]}] {r[2]}{detail}")
    
    summary = f"共 {len(rows)} 条记录，涵盖 {len(projects)} 个项目"
    content = f"""📋 日报 {date}

{chr(10).join(lines)}

---
📊 分类统计: {', '.join([f'{k}({v})' for k,v in categories.items()])}
🏗️ 项目分布: {', '.join([f'{k}({v})' for k,v in projects.items()])}
📝 {summary}"""
    
    return content, summary

def get_weekly_report(monday_date=None):
    """生成周报（以给定周一为起始）"""
    if monday_date is None:
        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        monday_date = monday.strftime("%Y-%m-%d")
    
    end_date = (datetime.strptime(monday_date, "%Y-%m-%d") + timedelta(days=6)).strftime("%Y-%m-%d")
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute("""
        SELECT log_date, COUNT(*) as cnt
        FROM daily_log 
        WHERE log_date BETWEEN ? AND ?
        GROUP BY log_date
        ORDER BY log_date
    """, (monday_date, end_date))
    daily_counts = dict(cur.fetchall())
    
    cur = conn.execute("""
        SELECT category, COUNT(*) as cnt
        FROM daily_log 
        WHERE log_date BETWEEN ? AND ?
        GROUP BY category
        ORDER BY cnt DESC
    """, (monday_date, end_date))
    categories = dict(cur.fetchall())
    
    cur = conn.execute("""
        SELECT project, COUNT(*) as cnt
        FROM daily_log 
        WHERE log_date BETWEEN ? AND ? AND project IS NOT NULL
        GROUP BY project
        ORDER BY cnt DESC
    """, (monday_date, end_date))
    projects = dict(cur.fetchall())
    
    cur = conn.execute("""
        SELECT description FROM daily_log 
        WHERE log_date BETWEEN ? AND ?
        ORDER BY log_time
    """, (monday_date, end_date))
    all_items = [r[0] for r in cur.fetchall()]
    conn.close()
    
    total = sum(daily_counts.values()) if daily_counts else 0
    active_days = len(daily_counts)
    
    content = f"""📊 周报 {monday_date} ~ {end_date}

📅 工作日: {active_days} 天
📝 总活动: {total} 条

🏗️ 项目分布:
{chr(10).join([f"  • {k}: {v} 条" for k, v in projects.items()]) if projects else "  (无项目记录)"}

📂 分类统计:
{chr(10).join([f"  • {k}: {v} 条" for k, v in categories.items()]) if categories else "  (无分类记录)"}

✅ 本周主要工作:
{chr(10).join([f"  • {item}" for item in all_items[:15]])}
{"  ...等" if len(all_items) > 15 else ""}"""
    
    return content, f"周报 {monday_date}~{end_date}，共{total}条"

def get_monthly_report(year=None, month=None):
    """生成月报"""
    if year is None or month is None:
        today = datetime.now()
        # 上个月
        if today.month == 1:
            year, month = today.year - 1, 12
        else:
            year, month = today.year, today.month - 1
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
    
    month_name = f"{year}年{month}月"
    
    conn = sqlite3.connect(DB_PATH)
    
    cur = conn.execute("""
        SELECT COUNT(DISTINCT log_date) FROM daily_log 
        WHERE log_date >= ? AND log_date < ?
    """, (start_date, end_date))
    active_days = cur.fetchone()[0] or 0
    
    cur = conn.execute("""
        SELECT COUNT(*) FROM daily_log 
        WHERE log_date >= ? AND log_date < ?
    """, (start_date, end_date))
    total = cur.fetchone()[0] or 0
    
    cur = conn.execute("""
        SELECT category, COUNT(*) as cnt
        FROM daily_log 
        WHERE log_date >= ? AND log_date < ?
        GROUP BY category ORDER BY cnt DESC
    """, (start_date, end_date))
    categories = dict(cur.fetchall())
    
    cur = conn.execute("""
        SELECT project, COUNT(*) as cnt
        FROM daily_log 
        WHERE log_date >= ? AND log_date < ? AND project IS NOT NULL
        GROUP BY project ORDER BY cnt DESC
    """, (start_date, end_date))
    projects = dict(cur.fetchall())
    conn.close()
    
    content = f"""📈 月报 {month_name}

📅 工作天数: {active_days} 天
📝 总活动数: {total} 条
📊 日均: {total/active_days:.1f} 条（活跃日）

🏗️ 项目分布:
{chr(10).join([f"  • {k}: {v} 条" for k, v in projects.items()]) if projects else "  (无项目记录)"}

📂 分类统计:
{chr(10).join([f"  • {k}: {v} 条" for k, v in categories.items()]) if categories else "  (无分类记录)"}"""
    
    return content, f"{month_name}月报，共{total}条"

if __name__ == "__main__":
    import sys
    report_type = sys.argv[1] if len(sys.argv) > 1 else "daily"
    
    if report_type == "daily":
        date = sys.argv[2] if len(sys.argv) > 2 else None
        content, summary = get_daily_report(date)
    elif report_type == "weekly":
        monday = sys.argv[2] if len(sys.argv) > 2 else None
        content, summary = get_weekly_report(monday)
    elif report_type == "monthly":
        year = int(sys.argv[2]) if len(sys.argv) > 2 else None
        month = int(sys.argv[3]) if len(sys.argv) > 3 else None
        content, summary = get_monthly_report(year, month)
    else:
        print("用法: gen_report.py [daily|weekly|monthly] [date...]")
        sys.exit(1)
    
    # 写入待发送
    pending = {
        "type": report_type,
        "content": content,
        "summary": summary,
        "generated_at": datetime.now().isoformat(),
        "sent": False
    }
    with open(PENDING_PATH, "w") as f:
        json.dump(pending, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {summary}")
    print(f"📁 已写入 {PENDING_PATH}")
