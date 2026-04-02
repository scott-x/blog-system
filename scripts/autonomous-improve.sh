#!/bin/bash
# autonomous-improve.sh - 自动发现问题、创建Issue、尝试修复
set -e

GITHUB_REPO="scott-x/blog-system"
BACKEND_DIR="$HOME/projects/blog-system/backend"
LOG_FILE="$BACKEND_DIR/server.log"
STATE_FILE="$HOME/.openclaw/.autonomous-state.json"

echo "[$(date)] Starting autonomous check..."

# 检测GitHub CLI
if ! command -v gh &>/dev/null; then
    echo "gh CLI not found, skipping GitHub issue creation"
    GH_AVAILABLE=0
else
    GH_AVAILABLE=1
    # 检查是否已登录
    gh auth status &>/dev/null || GH_AVAILABLE=0
fi

# 确保labels存在
ensure_labels() {
    if [ "$GH_AVAILABLE" -eq 1 ]; then
        gh label create "autonomous" --repo "$GITHUB_REPO" 2>/dev/null || true
        gh label create "critical" --repo "$GITHUB_REPO" 2>/dev/null || true
        gh label create "bug" --repo "$GITHUB_REPO" 2>/dev/null || true
        gh label create "enhancement" --repo "$GITHUB_REPO" 2>/dev/null || true
    fi
}
ensure_labels

# 1. 检查服务是否在运行
SERVICE_RUNNING=1
curl -sf http://localhost:8080/api/posts &>/dev/null || SERVICE_RUNNING=0

if [ "$SERVICE_RUNNING" -eq 0 ]; then
    echo "⚠️ Backend service is DOWN"
    if [ "$GH_AVAILABLE" -eq 1 ]; then
        # 检查是否已经提过这个问题
        EXISTING=$(gh issue list --repo "$GITHUB_REPO" --label "autonomous" --state open --json number,title -q '.[] | select(.title | contains("服务宕机")) | .number' 2>/dev/null || true)
        if [ -z "$EXISTING" ]; then
            ISSUE_URL=$(gh issue create --repo "$GITHUB_REPO" \
                --title "🚨 [自动报告] Backend 服务宕机" \
                --body "## 问题\n服务在 $(date) 检测到不可用。\n\n## 检查\ncurl -sf http://localhost:8080/api/posts 返回失败。\n\n## 建议\n1. 检查 backend 进程是否存活：\`pgrep -f blog-backend\`\n2. 查看日志：\`tail -100 $LOG_FILE\`\n3. 重启服务：\`cd $BACKEND_DIR && ./server &\`" \
                --label "autonomous" --label "critical" 2>/dev/null || true)
            if [ -n "$ISSUE_URL" ]; then
                echo "✅ Created issue: Backend 服务宕机 ($ISSUE_URL)"
            fi
        else
            echo "ℹ️ Issue already exists: #$EXISTING"
        fi
    fi
fi

# 2. 检查日志中的错误
if [ -f "$LOG_FILE" ]; then
    RECENT_ERRORS=$(tail -200 "$LOG_FILE" 2>/dev/null | grep -i "error\|panic\|fatal" | tail -5 || true)
    if [ -n "$RECENT_ERRORS" ]; then
        echo "⚠️ Found errors in logs"
        if [ "$GH_AVAILABLE" -eq 1 ]; then
            ERROR_SAMPLE=$(echo "$RECENT_ERRORS" | head -3 | sed 's/^/    /')
            EXISTING=$(gh issue list --repo "$GITHUB_REPO" --label "autonomous" --state open --json number,title -q '.[] | select(.title | contains("日志错误")) | .number' 2>/dev/null || true)
            if [ -z "$EXISTING" ]; then
                ISSUE_URL=$(gh issue create --repo "$GITHUB_REPO" \
                    --title "🔍 [自动报告] 发现错误日志" \
                    --body "## 问题\n在 server.log 中发现错误：\n\n\`\`\`\n$ERROR_SAMPLE\n\`\`\`\n\n## 建议\n查看完整日志：\`tail -500 $LOG_FILE | grep -i error\`" \
                    --label "autonomous" --label "bug" 2>/dev/null || true)
                if [ -n "$ISSUE_URL" ]; then
                    echo "✅ Created issue: 日志错误 ($ISSUE_URL)"
                fi
            fi
        fi
    fi
fi

# 3. 检查未提交的代码改动
cd "$HOME/projects/blog-system"
UNCOMMITTED=$(git status --porcelain 2>/dev/null || true)
if [ -n "$UNCOMMITTED" ]; then
    echo "⚠️ Uncommitted changes found"
    
    # 简单检查：是否有明显的语法错误
    SYNTAX_OK=1
    for f in $(echo "$UNCOMMITTED" | grep -E '\.(go|ts|tsx|js|jsx)$' | awk '{print $2}'); do
        if [ -f "$f" ]; then
            case "$f" in
                *.go)
                    go build ./... &>/dev/null || SYNTAX_OK=0
                    ;;
            esac
        fi
    done
    
    if [ "$SYNTAX_OK" -eq 0 ]; then
        echo "⚠️ Syntax errors detected"
        if [ "$GH_AVAILABLE" -eq 1 ]; then
            UNCOMMITTED_FILES=$(echo "$UNCOMMITTED" | awk '{print $2}' | head -10 | tr '\n' ' ')
            ISSUE_URL=$(gh issue create --repo "$GITHUB_REPO" \
                --title "🐛 [自动报告] 语法错误" \
                --body "## 问题\n未提交的代码存在语法错误。\n\n## 变更文件\n$UNCOMMITTED_FILES\n\n## 建议\n运行 \`go build\` 或 \`tsc --noEmit\` 检查具体错误。" \
                --label "autonomous" --label "bug" 2>/dev/null || true)
            if [ -n "$ISSUE_URL" ]; then
                echo "✅ Created issue: 语法错误 ($ISSUE_URL)"
            fi
        fi
    fi
    
    # 4. 定期自动提交无争议的改动（如文档、配置等）
    SAFE_PATTERNS="README|\.md$|\.yaml$|\.yml$|\.gitignore|scripts/"
    SAFE_FILES=$(echo "$UNCOMMITTED" | grep -E "$SAFE_PATTERNS" | awk '{print $2}' || true)
    
    if [ -n "$SAFE_FILES" ]; then
        echo "📝 Auto-committing safe files..."
        git add $SAFE_FILES
        git commit -m "chore: update docs/config ($(date +%Y-%m-%d))" &>/dev/null || true
        # 尝试推送
        git push origin main &>/dev/null || true
        echo "✅ Auto-committed safe files"
    fi
fi

echo "[$(date)] Autonomous check complete."
