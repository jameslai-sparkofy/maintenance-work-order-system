# Render 部署指南

## 🚀 快速部署步驟

### 1. 在Render創建新服務
1. 登入 [Render.com](https://render.com)
2. 點擊 "New +" → "Web Service"
3. 連接您的GitHub repository: `jameslai-sparkofy/maintenance-work-order-system`

### 2. 基本配置
```
Name: maintenance-work-order-system
Environment: Node
Branch: main
Build Command: npm install
Start Command: node src/main/js/app.js
```

### 3. 環境變數設定
在Render的Environment Variables區域添加：

```
NODE_ENV=production
SESSION_SECRET=[自動生成或設定自己的secret]
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=ethereal.user@ethereal.email
SMTP_PASS=ethereal.pass
```

### 4. 進階設定（可選）
```
Health Check Path: /
Auto-Deploy: Yes
```

## 📋 重要注意事項

### 資料庫
- 系統使用SQLite，數據會存儲在臨時文件系統中
- **重要**: Render的免費方案會在每次部署時重置文件系統
- 生產環境建議升級到付費方案或使用外部資料庫

### 文件上傳
- 圖片上傳功能在免費方案中可能受限
- 建議整合雲端存儲服務（如AWS S3, Cloudinary）

### Email設定
- 當前使用Ethereal Email測試服務
- 生產環境請更換為實際的SMTP服務商：
  - Gmail SMTP
  - SendGrid
  - Mailgun
  - Amazon SES

## 🔧 生產環境優化建議

### 1. 資料庫升級
考慮使用以下選項：
- PostgreSQL (Render提供)
- MongoDB Atlas
- PlanetScale MySQL

### 2. 文件存儲
整合雲端存儲：
```javascript
// 建議整合Cloudinary或AWS S3
const cloudinary = require('cloudinary').v2;
```

### 3. Email服務
生產環境SMTP設定：
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. 安全性增強
- 設定強度較高的SESSION_SECRET
- 啟用HTTPS（Render自動提供）
- 考慮添加API認證

## 🌐 部署後測試

部署完成後，請測試以下功能：
1. ✅ 首頁載入
2. ✅ 新增維修單
3. ✅ 工單列表顯示
4. ✅ 工務人員管理
5. ✅ 圖片上傳
6. ✅ 數位簽名
7. ✅ Email通知（如果配置）

## 🚨 故障排除

### 常見問題
1. **服務啟動失敗**
   - 檢查Node.js版本（需要>=16.0.0）
   - 檢查package.json中的start腳本

2. **資料庫錯誤**
   - SQLite在首次運行時會自動創建
   - 檢查寫入權限

3. **靜態文件404**
   - 確認靜態文件路徑配置正確
   - 檢查express.static設定

### 日誌查看
在Render控制台的"Logs"標籤查看詳細錯誤信息。

## 📞 支持

如遇部署問題，請檢查：
1. Render官方文檔
2. GitHub Issues
3. 系統日誌

---

**祝您部署順利！** 🎉