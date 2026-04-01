-- 每日活动日志
CREATE TABLE IF NOT EXISTS daily_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date DATE NOT NULL,
    log_time TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'dev'|'config'|'meeting'|'research'|'fix'|'other'
    description TEXT NOT NULL,
    project TEXT,            -- 项目名
    details TEXT,            -- 详细内容（JSON）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_log_date ON daily_log(log_date);

-- 已发送报告记录
CREATE TABLE IF NOT EXISTS sent_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,  -- 'daily'|'weekly'|'monthly'
    report_date DATE NOT NULL,   -- 报告对应的日期
    period_start DATE,
    period_end DATE,
    content TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sent_reports_type ON sent_reports(report_type, report_date);
