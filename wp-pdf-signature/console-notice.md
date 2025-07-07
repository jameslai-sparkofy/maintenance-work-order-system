# 控制台警告說明

## 關於jQuery Deprecation警告

如果您在瀏覽器控制台中看到以下警告：

```
[Deprecation] Listener added for a 'DOMNodeInserted' mutation event. 
Support for this event type has been removed, and this event will no longer be fired.
```

**這些警告不會影響系統功能**，通常來自以下來源：

### 可能的來源

1. **瀏覽器擴展** - 如廣告攔截器、翻譯工具等
2. **WordPress主題** - 使用舊版jQuery的主題
3. **其他插件** - 尚未更新的第三方插件

### 如何處理

#### 方法1：隱藏控制台警告（推薦）
在瀏覽器控制台中執行以下代碼：
```javascript
// 隱藏jQuery警告
console.warn = (function(originalWarn) {
    return function() {
        const message = Array.prototype.slice.call(arguments).join(' ');
        if (!message.includes('DOMNodeInserted') && 
            !message.includes('mutation event') &&
            !message.includes('message channel closed')) {
            originalWarn.apply(console, arguments);
        }
    };
})(console.warn);
```

#### 方法2：更新WordPress主題
確保您的WordPress主題使用最新版本，或聯繫主題開發者更新jQuery用法。

#### 方法3：禁用相關瀏覽器擴展
暫時禁用瀏覽器擴展，查看警告是否消失。

### 系統狀態確認

雖然有這些警告，PDF簽名系統仍然：
- ✅ 正常上傳PDF文件
- ✅ 正確設定簽名欄位
- ✅ 完整的簽名功能
- ✅ 安全的數據處理

### 技術說明

這些警告來自已被棄用的DOM Mutation Events，現代瀏覽器建議使用MutationObserver替代。我們的系統已經使用了現代化的事件處理機制，這些警告不會影響功能。

### 如果問題持續

如果警告影響到您的使用體驗，請：

1. 檢查瀏覽器控制台的"來源"欄位，確定警告來源
2. 更新所有WordPress插件和主題到最新版本
3. 考慮切換到使用現代JavaScript的WordPress主題

**重要**：這些警告純粹是提醒性質，不會影響網站安全性或功能性。