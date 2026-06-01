# start-work.ps1 — 開工檢查腳本（Windows / PowerShell）
# 用法：在 repo 根目錄執行  ./start-work.ps1
#
# 它會：先抓遠端最新資訊（不動你的檔案），再告訴你本機跟 GitHub 差多少，
# 以及該不該 git pull。安全無副作用 — fetch 只下載資訊，不會覆蓋你的工作。

Write-Host ""
Write-Host "=== 開工檢查 ===" -ForegroundColor Cyan

# 1. 抓遠端資訊（不合併、不動工作目錄）
Write-Host "→ 正在抓取遠端最新資訊 (git fetch)..." -ForegroundColor Gray
git fetch --quiet

# 2. 目前分支
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host ("→ 目前分支：{0}" -f $branch)

# 3. 有沒有未 commit 的改動？
$dirty = git status --porcelain
if ($dirty) {
    Write-Host "⚠ 你有「還沒 commit」的改動：" -ForegroundColor Yellow
    git status --short
    Write-Host "  收工前記得把該留的 commit 掉，別擱著過夜（上次就是這樣卡住的）。" -ForegroundColor Yellow
} else {
    Write-Host "✓ 工作目錄乾淨，沒有未 commit 的改動。" -ForegroundColor Green
}

# 4. 本機 vs 遠端：落後 / 領先幾個 commit
$counts = git rev-list --left-right --count "HEAD...@{u}" 2>$null
if ($LASTEXITCODE -eq 0 -and $counts) {
    $parts  = $counts -split "\s+"
    $ahead  = [int]$parts[0]   # 本機領先（還沒 push）
    $behind = [int]$parts[1]   # 遠端領先（你還沒 pull）

    Write-Host ""
    if ($behind -gt 0 -and $ahead -gt 0) {
        Write-Host ("⚠ 兩邊都動過了：本機領先 {0} 個、遠端領先 {1} 個 commit。" -f $ahead, $behind) -ForegroundColor Yellow
        Write-Host "  → 先把未 commit 的東西處理好，再執行： git pull" -ForegroundColor Yellow
    }
    elseif ($behind -gt 0) {
        Write-Host ("⚠ 遠端有 {0} 個新 commit，你的本機落後了。" -f $behind) -ForegroundColor Yellow
        Write-Host "  → 開工前先執行： git pull" -ForegroundColor Yellow
    }
    elseif ($ahead -gt 0) {
        Write-Host ("ℹ 本機領先 {0} 個 commit 還沒推上去。收工前記得： git push" -f $ahead) -ForegroundColor Cyan
    }
    else {
        Write-Host "✓ 本機與遠端完全同步，可以直接開工！" -ForegroundColor Green
    }
} else {
    Write-Host "（這個分支沒有對應的遠端分支，略過落後/領先比對。）" -ForegroundColor Gray
}

Write-Host ""
