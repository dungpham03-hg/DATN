# Script dọn dẹp cấu trúc cũ sau khi tái tổ chức
# Chạy script này sau khi đã test và confirm cấu trúc mới hoạt động tốt

Write-Host "🧹 Cleaning up old structure..." -ForegroundColor Green

# Danh sách file/folder cần xóa sau khi đã di chuyển
$itemsToRemove = @(
    "scripts",                    # Đã di chuyển vào deployment/scripts
    "nginx",                      # Đã di chuyển vào deployment/nginx  
    "monitoring/prometheus.yml",  # Đã có trong monitoring/prometheus/
    "docker-compose.yml",         # Đã di chuyển vào deployment/docker/
    "docker-compose.prod.yml",    # Đã di chuyển vào deployment/docker/
    "docker-compose.test.yml",    # Đã di chuyển vào deployment/docker/
    "env.production.example",     # Đã di chuyển vào deployment/environments/
    "DOCKER_README.md",           # Đã tích hợp vào README.md mới
    "README_TESTING.md",          # Đã di chuyển vào docs/testing/
    "README_VPS_OPTIMIZATION.md", # Đã tích hợp vào docs/deployment/
    "test-auth.js",               # File test cũ không cần thiết
    "FOLDER_RESTRUCTURE_PLAN.md", # File tạm thời
    "node_modules"                # Sẽ reinstall sau
)

Write-Host "⚠️  WARNING: This will delete the following items:" -ForegroundColor Yellow
foreach ($item in $itemsToRemove) {
    if (Test-Path $item) {
        Write-Host "  - $item" -ForegroundColor Red
    }
}

Write-Host ""
$confirm = Read-Host "Are you sure you want to proceed? (y/N)"

if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    Write-Host "🗑️  Removing old structure..." -ForegroundColor Yellow
    
    foreach ($item in $itemsToRemove) {
        if (Test-Path $item) {
            try {
                Remove-Item -Path $item -Recurse -Force
                Write-Host "✅ Removed: $item" -ForegroundColor Green
            }
            catch {
                Write-Host "❌ Failed to remove: $item - $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "⏭️  Skipped (not found): $item" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "🎉 Cleanup completed!" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run 'npm install' to reinstall dependencies" -ForegroundColor White
    Write-Host "  2. Test the new structure with 'npm run dev'" -ForegroundColor White
    Write-Host "  3. Update your deployment scripts if needed" -ForegroundColor White
    Write-Host "  4. Commit the new structure to git" -ForegroundColor White
    
} else {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
}

Write-Host ""
Write-Host "📁 New structure overview:" -ForegroundColor Cyan
Write-Host "  deployment/  - All deployment configs" -ForegroundColor White
Write-Host "  docs/        - Organized documentation" -ForegroundColor White  
Write-Host "  tests/       - Cross-app tests" -ForegroundColor White
Write-Host "  tools/       - Development tools" -ForegroundColor White
Write-Host "  monitoring/  - Monitoring configs" -ForegroundColor White
