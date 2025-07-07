# WP PDF Signature 🖋️

> **WordPress PDF線上簽名系統** - 基於DocuSeal概念開發，提供完整的PDF文件簽名解決方案

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/user/wp-pdf-signature)
[![WordPress](https://img.shields.io/badge/WordPress-5.0%2B-blue.svg)](https://wordpress.org/)
[![PHP](https://img.shields.io/badge/PHP-7.4%2B-purple.svg)](https://php.net/)
[![License](https://img.shields.io/badge/license-GPL%20v2-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

## ✨ 功能特色

### 🎯 核心功能
- **PDF上傳和管理** - 支援拖拉上傳，自動驗證文件格式
- **簽名欄位設定** - 可視化拖拉式簽名區域劃定
- **數位簽名捕獲** - HTML5 Canvas手寫簽名支援
- **專屬分享連結** - 為每份文件生成唯一的簽名連結
- **Email自動通知** - 簽名完成後自動發送確認郵件
- **完整審計軌跡** - 記錄所有簽名活動和安全日誌

### 🛡️ 安全特性
- **文件加密存儲** - 敏感資料AES-256加密
- **IP地址記錄** - 完整的用戶活動追蹤
- **簽名驗證** - 數位簽名完整性檢查
- **存取控制** - 基於角色的權限管理
- **速率限制** - 防止濫用和攻擊

### 📱 用戶體驗
- **響應式設計** - 完美支援桌面、平板、手機
- **直觀操作** - 簡潔的用戶介面設計
- **即時預覽** - PDF文件即時渲染和顯示
- **進度追蹤** - 完整的簽名流程指引

## 🚀 快速開始

### 系統要求
- WordPress 5.0 或更高版本
- PHP 7.4 或更高版本
- MySQL 5.7 或更高版本
- 支援 `GD` 或 `Imagick` 擴展（用於PDF預覽）

### 安裝步驟

1. **下載插件**
   ```bash
   git clone https://github.com/user/wp-pdf-signature.git
   ```

2. **上傳到WordPress**
   - 將整個資料夾上傳至 `/wp-content/plugins/`
   - 或通過WordPress管理後台上傳ZIP檔案

3. **啟用插件**
   - 在WordPress管理後台進入「插件」頁面
   - 找到「WP PDF Signature」並點擊啟用

4. **初始設定**
   - 進入「PDF簽名」→「設定」
   - 配置基本參數和郵件設定

## 📖 使用指南

### 管理員操作

#### 1. 創建簽名文件
```
管理後台 → PDF簽名 → 新增文件
```
1. 上傳PDF文件
2. 設定文件標題和描述
3. 拖拉設定簽名欄位位置
4. 保存並生成分享連結

#### 2. 管理簽名記錄
```
管理後台 → PDF簽名 → 簽名記錄
```
- 查看所有簽名活動
- 下載已簽名文件
- 審計軌跡查詢

#### 3. 系統設定
```
管理後台 → PDF簽名 → 設定
```
- 上傳文件大小限制
- 簽名樣式設定
- 郵件通知開關
- 安全級別配置

### 客戶端操作

1. **訪問簽名連結**
   - 點擊收到的簽名連結
   - 系統自動載入PDF文件

2. **填寫簽名資訊**
   - 輸入姓名和電子郵件
   - 在簽名板上簽名
   - 同意簽名條款

3. **提交簽名**
   - 系統驗證簽名完整性
   - 生成已簽名PDF
   - 發送確認郵件

## 🔧 開發者指南

### 文件結構
```
wp-pdf-signature/
├── wp-pdf-signature.php          # 主插件文件
├── includes/                     # 核心類文件
│   ├── class-pdf-handler.php     # PDF處理類
│   ├── class-signature-capture.php # 簽名捕獲類
│   ├── class-security-manager.php  # 安全管理類
│   ├── class-database-manager.php  # 資料庫管理類
│   └── class-email-notifications.php # 郵件通知類
├── admin/                        # 管理員介面
│   └── class-admin-interface.php # 後台介面類
├── public/                       # 前台介面
│   └── class-public-interface.php # 前台介面類
├── assets/                       # 靜態資源
│   ├── js/                       # JavaScript文件
│   │   ├── admin.js              # 管理員腳本
│   │   ├── public.js             # 前台腳本
│   │   ├── pdf-lib.min.js        # PDF處理庫
│   │   ├── signature-pad.min.js  # 簽名板庫
│   │   ├── pdf.min.js            # PDF.js核心
│   │   └── pdf.worker.min.js     # PDF.js工作線程
│   └── css/                      # 樣式文件
│       ├── admin.css             # 管理員樣式
│       └── public.css            # 前台樣式
└── README.md                     # 說明文件
```

### 資料庫表結構

#### 簽名記錄表 (`wp_pdf_signature_logs`)
```sql
id                  # 主鍵
document_id         # 文件ID
user_id            # 用戶ID（可選）
signature_data     # 簽名圖片數據
signature_hash     # 簽名哈希值
signer_name        # 簽名者姓名
signer_email       # 簽名者郵箱
signer_ip          # 簽名者IP
user_agent         # 瀏覽器信息
signature_position # 簽名位置
status             # 簽名狀態
created_at         # 創建時間
updated_at         # 更新時間
```

#### 簽名欄位表 (`wp_pdf_signature_fields`)
```sql
id              # 主鍵
document_id     # 文件ID
field_type      # 欄位類型
field_name      # 欄位名稱
field_position  # 欄位位置
field_size      # 欄位大小
field_required  # 是否必填
field_order     # 排序順序
created_at      # 創建時間
```

### 鉤子和過濾器

#### 動作鉤子 (Actions)
```php
// 文件簽名完成後
do_action('wp_pdf_signature_document_signed', $document_id, $signature_data);

// 文件創建後
do_action('wp_pdf_signature_document_created', $document_id);

// 發送簽名提醒
do_action('wp_pdf_signature_signature_reminder', $document_id, $email);
```

#### 過濾器 (Filters)
```php
// 驗證文件上傳
apply_filters('wp_pdf_signature_validate_upload', $is_valid, $file);

// 自定義郵件模板
apply_filters('wp_pdf_signature_email_template', $template, $type, $vars);

// 修改簽名欄位
apply_filters('wp_pdf_signature_signature_fields', $fields, $document_id);
```

### 自定義開發範例

#### 添加自定義簽名欄位類型
```php
add_filter('wp_pdf_signature_field_types', function($types) {
    $types['custom_field'] = '自定義欄位';
    return $types;
});
```

#### 自定義郵件模板
```php
add_filter('wp_pdf_signature_email_template', function($template, $type, $vars) {
    if ($type === 'signer-confirmation') {
        return '<h1>自定義確認郵件</h1><p>您好 ' . $vars['signer_name'] . '</p>';
    }
    return $template;
}, 10, 3);
```

## ⚙️ 配置選項

### 環境變數
```bash
# 上傳文件大小限制（MB）
WP_PDF_SIGNATURE_MAX_UPLOAD_SIZE=10

# 文件過期天數
WP_PDF_SIGNATURE_FILE_EXPIRY_DAYS=30

# 啟用調試模式
WP_PDF_SIGNATURE_DEBUG=true
```

### WordPress選項
```php
// 設定選項
update_option('wp_pdf_signature_upload_max_size', 10);
update_option('wp_pdf_signature_signature_color', '#000000');
update_option('wp_pdf_signature_email_notifications', 1);
```

## 🔐 安全考量

### 數據保護
- 所有敏感數據使用AES-256加密
- 簽名圖片存儲在受保護的目錄
- 完整的訪問日誌記錄

### 權限控制
- 基於WordPress角色的權限管理
- 管理員：完整系統控制
- 編輯者：創建和管理文件
- 訂閱者：僅查看分配的文件

### 安全建議
1. 定期更新插件到最新版本
2. 使用強密碼和雙因素認證
3. 定期備份簽名數據
4. 監控系統日誌異常活動

## 📊 性能優化

### 建議配置
```php
// 增加PHP內存限制
ini_set('memory_limit', '256M');

// 增加上傳限制
ini_set('upload_max_filesize', '10M');
ini_set('post_max_size', '10M');
```

### 快取策略
- 使用WordPress對象快取
- PDF預覽圖片快取
- 簽名欄位數據快取

## 🐛 問題排除

### 常見問題

**Q: PDF無法正確顯示？**
A: 檢查服務器是否安裝GD或Imagick擴展

**Q: 簽名提交失敗？**
A: 檢查AJAX請求和nonce驗證

**Q: 郵件通知未發送？**
A: 確認WordPress郵件配置正確

### 調試模式
```php
// 在wp-config.php中啟用調試
define('WP_PDF_SIGNATURE_DEBUG', true);
```

## 🤝 貢獻指南

我們歡迎社區貢獻！

### 開發流程
1. Fork此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 創建Pull Request

### 代碼標準
- 遵循WordPress編碼標準
- 添加適當的註釋和文檔
- 確保向後兼容性

## 📝 更新日誌

### v1.0.0 (2025-07-07)
- 🎉 初始版本發布
- ✨ 完整的PDF簽名功能
- 🛡️ 安全性和審計軌跡
- 📧 Email通知系統
- 📱 響應式設計

## 📄 授權協議

本專案採用 [GPL v2](https://www.gnu.org/licenses/gpl-2.0.html) 授權協議。

## 📞 支援與聯繫

- **文檔**: [查看完整文檔](https://github.com/user/wp-pdf-signature/wiki)
- **問題回報**: [GitHub Issues](https://github.com/user/wp-pdf-signature/issues)
- **功能請求**: [GitHub Discussions](https://github.com/user/wp-pdf-signature/discussions)

---

**使用WordPress PDF簽名系統，讓文件簽名變得簡單、安全、高效！** 🚀

Made with ❤️ by Claude AI