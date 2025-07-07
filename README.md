# 線上工單系統

## 系統概述
內部人員工務維修單管理系統，支援線上產生維修單、客戶確認簽名、以及 Email 通知功能。

## 主要功能
1. **維修單生成** - 內部人員可透過前台介面產生維修單
2. **專屬連結分享** - 每個維修單擁有專屬連結供客戶或工地主任查看
3. **數位簽名確認** - 客戶/主任可透過連結進行數位簽名確認
4. **Email 通知** - 簽名完成後自動發送確認 Email
5. **維修單管理** - 提供清單檢視與篩選功能

## 技術架構
- **前端**: JavaScript/HTML/CSS
- **後端**: Node.js
- **資料庫**: SQLite/MySQL
- **檔案上傳**: 支援多張照片上傳

## 快速開始

1. **Read CLAUDE.md first** - Contains essential rules for Claude Code
2. Follow the pre-task compliance checklist before starting any work
3. Use proper module structure under `src/main/js/`
4. Commit after every completed task

## 開發指南

- **Always search first** before creating new files
- **Extend existing** functionality rather than duplicating  
- **Use Task agents** for operations >30 seconds
- **Single source of truth** for all functionality
- **Language-agnostic structure** - works with any tech stack
- **Scalable** - start simple, grow as needed

## 專案結構

```
src/main/js/
├── components/     # UI 元件
├── views/         # 頁面視圖
├── services/      # 業務邏輯服務
├── api/          # API 介面
├── models/       # 資料模型
├── utils/        # 工具函數
└── core/         # 核心功能
```