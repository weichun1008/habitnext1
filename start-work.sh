#!/usr/bin/env bash
# start-work.sh — 開工檢查腳本（Mac / Linux）
# 用法：在 repo 根目錄執行  ./start-work.sh
#       （第一次用前先給執行權限： chmod +x start-work.sh）
#
# 它會：先抓遠端最新資訊（不動你的檔案），再告訴你本機跟 GitHub 差多少，
# 以及該不該 git pull。安全無副作用 — fetch 只下載資訊，不會覆蓋你的工作。

set -u

echo ""
echo "=== 開工檢查 ==="

# 1. 抓遠端資訊（不合併、不動工作目錄）
echo "→ 正在抓取遠端最新資訊 (git fetch)..."
git fetch --quiet

# 2. 目前分支
branch=$(git rev-parse --abbrev-ref HEAD)
echo "→ 目前分支：$branch"

# 3. 有沒有未 commit 的改動？
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠ 你有「還沒 commit」的改動："
    git status --short
    echo "  收工前記得把該留的 commit 掉，別擱著過夜（上次就是這樣卡住的）。"
else
    echo "✓ 工作目錄乾淨，沒有未 commit 的改動。"
fi

# 4. 本機 vs 遠端：落後 / 領先幾個 commit
if counts=$(git rev-list --left-right --count "HEAD...@{u}" 2>/dev/null); then
    ahead=$(echo "$counts" | awk '{print $1}')   # 本機領先（還沒 push）
    behind=$(echo "$counts" | awk '{print $2}')  # 遠端領先（你還沒 pull）

    echo ""
    if [ "$behind" -gt 0 ] && [ "$ahead" -gt 0 ]; then
        echo "⚠ 兩邊都動過了：本機領先 $ahead 個、遠端領先 $behind 個 commit。"
        echo "  → 先把未 commit 的東西處理好，再執行： git pull"
    elif [ "$behind" -gt 0 ]; then
        echo "⚠ 遠端有 $behind 個新 commit，你的本機落後了。"
        echo "  → 開工前先執行： git pull"
    elif [ "$ahead" -gt 0 ]; then
        echo "ℹ 本機領先 $ahead 個 commit 還沒推上去。收工前記得： git push"
    else
        echo "✓ 本機與遠端完全同步，可以直接開工！"
    fi
else
    echo "（這個分支沒有對應的遠端分支，略過落後/領先比對。）"
fi

echo ""
