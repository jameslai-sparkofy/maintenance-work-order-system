# 線上工單系統 (Maintenance Work Order System)

## 🚀 快速開始

### 安裝依賴
```bash
npm install
```

### 啟動開發服務器
```bash
npm start
```

### 開發模式 (自動重啟)
```bash
npm run dev
```

### 訪問應用
- 主要應用: http://localhost:3000
- 新增工單: http://localhost:3000/maintenance/new
- 工單列表: http://localhost:3000/maintenance/list
- 工務人員管理: http://localhost:3000/maintenance/workers

## 📋 功能特色

### 🔧 維修單管理
- **自動編號**: 系統自動產生唯一工單號 (格式: WO20250707001)
- **完整資訊**: 支援日期、案場、位置、維修原因、工務人員、金額等欄位
- **照片上傳**: 支援多張照片上傳，最大 10MB
- **智能記憶**: 自動記憶常用案場和工務人員

### 🔗 專屬分享連結
- **唯一連結**: 每個工單自動產生專屬分享連結
- **客戶確認**: 客戶/工地主任可透過連結查看工單詳情
- **安全性**: 使用 UUID 確保連結唯一性和安全性

### ✍️ 數位簽名
- **觸控支援**: 支援滑鼠和觸控裝置簽名
- **簽名驗證**: 必須簽名才能確認工單
- **簽名記錄**: 記錄簽名人姓名、時間和 Email

### 📧 Email 通知
- **自動通知**: 簽名完成後自動發送確認 Email
- **專業模板**: 美觀的 HTML Email 模板
- **詳細資訊**: 包含完整工單資訊和簽名記錄

### 📊 管理介面
- **工單列表**: 支援篩選、搜尋和排序
- **統計資訊**: 總數、待確認、已確認、總金額統計
- **批量操作**: 支援 CSV 匯出
- **工務人員管理**: 新增、編輯、刪除工務人員

## 🏗️ 技術架構

### 後端技術棧
- **Node.js** + **Express**: 服務器框架
- **SQLite**: 輕量級資料庫
- **Multer**: 檔案上傳處理
- **Nodemailer**: Email 發送服務
- **UUID**: 唯一標識符生成

### 前端技術棧
- **Vanilla JavaScript**: 純 JavaScript，無框架依賴
- **HTML5 Canvas**: 數位簽名功能
- **CSS Grid/Flexbox**: 響應式布局
- **Progressive Web App**: 支援離線使用

### 安全特性
- **Helmet**: HTTP 安全標頭
- **CORS**: 跨域請求控制
- **Rate Limiting**: API 請求限制
- **Input Validation**: 輸入驗證和清理
- **SQL Injection Protection**: 參數化查詢

## 📁 專案結構

```
線上工單系統/
├── src/main/js/           # 後端程式碼
│   ├── app.js            # 主應用程式
│   ├── core/             # 核心功能
│   │   └── database.js   # 資料庫管理
│   ├── models/           # 資料模型
│   │   ├── WorkOrder.js  # 工單模型
│   │   └── Worker.js     # 工務人員模型
│   ├── api/              # API 路由
│   │   ├── workOrderRoutes.js
│   │   └── viewRoutes.js
│   ├── services/         # 服務層
│   │   └── emailService.js
│   └── views/            # HTML 視圖
├── src/main/resources/   # 靜態資源
│   └── assets/
│       ├── css/          # 樣式檔案
│       └── js/           # 前端 JavaScript
├── output/               # 輸出目錄
│   ├── database.sqlite   # SQLite 資料庫
│   └── uploads/          # 上傳的檔案
├── package.json          # 專案配置
└── README.md             # 說明文件
```

## 🗄️ 資料庫結構

### work_orders (工單表)
- `id`: 主鍵
- `work_order_number`: 工單號
- `date`: 日期
- `site_name`: 案場名稱
- `building/floor/unit`: 位置資訊
- `reason`: 維修原因
- `worker_name`: 工務人員
- `amount`: 金額
- `status`: 狀態 (pending/confirmed)
- `unique_link`: 專屬連結
- `created_at/updated_at`: 時間戳記

### work_order_photos (工單照片表)
- `id`: 主鍵
- `work_order_id`: 關聯工單 ID
- `photo_path`: 檔案路徑
- `original_name`: 原始檔名
- `file_size`: 檔案大小

### signatures (簽名表)
- `id`: 主鍵
- `work_order_id`: 關聯工單 ID
- `signature_data`: 簽名圖片 (Base64)
- `signer_name`: 簽名人姓名
- `signer_email`: 簽名人 Email
- `signed_at`: 簽名時間

### workers (工務人員表)
- `id`: 主鍵
- `name`: 姓名
- `phone`: 電話
- `email`: Email

### sites (案場表)
- `id`: 主鍵
- `name`: 案場名稱
- `last_used_at`: 最後使用時間

## 🔧 環境配置

### 環境變數 (.env)
```env
# 服務器配置
PORT=3000
NODE_ENV=development

# Session 配置
SESSION_SECRET=your-secret-key

# Email 配置 (生產環境)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
FROM_EMAIL=maintenance@company.com
```

### 開發環境設置
```bash
# 安裝 nodemon 用於自動重啟
npm install -g nodemon

# 使用開發模式啟動
npm run dev
```

## 📱 移動端支援

系統完全支援移動設備：
- **響應式設計**: 自適應各種螢幕尺寸
- **觸控優化**: 按鈕和表單針對觸控操作優化
- **數位簽名**: 支援手機和平板觸控簽名
- **圖片上傳**: 支援移動設備相機拍照上傳

## 🚀 部署指南

### 本機部署
```bash
# 1. 複製專案
git clone <repository-url>
cd 線上工單系統

# 2. 安裝依賴
npm install

# 3. 設置環境變數
cp .env.example .env
# 編輯 .env 檔案

# 4. 啟動應用
npm start
```

### 雲端部署 (Heroku)
```bash
# 1. 安裝 Heroku CLI
# 2. 登入 Heroku
heroku login

# 3. 建立應用
heroku create your-app-name

# 4. 設置環境變數
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret

# 5. 部署
git push heroku main
```

## 📊 效能優化

- **資料庫索引**: 關鍵欄位建立索引提升查詢效能
- **檔案壓縮**: 圖片自動壓縮和優化
- **快取機制**: 靜態資源快取
- **CDN 支援**: 可配置 CDN 加速
- **圖片延遲載入**: 大量圖片時提升載入速度

## 🔒 安全考量

- **輸入驗證**: 所有用戶輸入都經過驗證和清理
- **檔案安全**: 限制上傳檔案類型和大小
- **SQL 注入防護**: 使用參數化查詢
- **XSS 防護**: 輸出內容自動轉義
- **CSRF 防護**: 表單使用 CSRF Token
- **HTTPS**: 生產環境強制使用 HTTPS

## 🛠️ 維護指南

### 定期維護
- **資料庫備份**: 定期備份 SQLite 資料庫
- **日誌檢查**: 監控應用程式日誌
- **更新依賴**: 定期更新 npm 套件
- **效能監控**: 監控系統效能指標

### 故障排除
```bash
# 檢查日誌
npm run logs

# 重啟服務
npm restart

# 檢查資料庫
sqlite3 output/database.sqlite .schema
```

## 📄 授權

MIT License

## 👥 貢獻

歡迎提交 Pull Request 或開 Issue 討論功能改進。

## 📞 技術支援

如有技術問題，請聯繫開發團隊或查看專案 GitHub Issues。

---

**🎯 專案特色**: 專業、簡潔、高效的維修工單管理解決方案，完全符合現代企業數位化需求。