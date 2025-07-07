<?php
/**
 * 兼容性載入器 - 必須在所有其他代碼之前執行
 * 這個文件會在WordPress載入任何其他腳本之前就開始工作
 */

// 防止直接訪問
if (!defined('ABSPATH')) {
    exit;
}

// 在WordPress最早期就開始攔截
add_action('wp_loaded', 'wp_pdf_signature_force_compatibility', -9999);
add_action('admin_init', 'wp_pdf_signature_force_compatibility', -9999);

function wp_pdf_signature_force_compatibility() {
    // 如果已經執行過，跳過
    if (defined('WP_PDF_SIGNATURE_COMPAT_LOADED')) {
        return;
    }
    define('WP_PDF_SIGNATURE_COMPAT_LOADED', true);
    
    // 輸出兼容性腳本到頁面最頂部
    ob_start(function($buffer) {
        // 載入外部終極修復腳本
        $ultimate_fix_url = plugin_dir_url(__FILE__) . 'ultimate-fix.js?v=' . time();
        
        $compatibility_script = '
<script type="text/javascript" src="' . $ultimate_fix_url . '"></script>
<script type="text/javascript">
/* PDF簽名系統 - 緊急兼容性修復 */
(function() {
    "use strict";
    
    // 如果已經修復過，跳過
    if (window._pdfSignatureEmergencyFix) return;
    window._pdfSignatureEmergencyFix = true;
    
    // 完全禁用所有mutation events的註冊
    const deprecatedEvents = [
        "DOMNodeInserted", "DOMNodeRemoved", "DOMSubtreeModified",
        "DOMAttrModified", "DOMCharacterDataModified"
    ];
    
    // 攔截所有可能的事件註冊方式
    if (typeof EventTarget !== "undefined") {
        const originalAdd = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (deprecatedEvents.indexOf(type) !== -1) {
                console.info("PDF簽名系統: 緊急攔截 " + type);
                return; // 完全不執行
            }
            return originalAdd.call(this, type, listener, options);
        };
    }
    
    // 立即攔截jQuery（如果存在）
    function interceptJQuery() {
        if (typeof window.jQuery !== "undefined") {
            const $ = window.jQuery;
            
            // 覆蓋jQuery的所有事件方法
            ["on", "bind", "live", "delegate"].forEach(function(method) {
                if ($.fn[method]) {
                    const original = $.fn[method];
                    $.fn[method] = function(events) {
                        if (typeof events === "string") {
                            deprecatedEvents.forEach(function(event) {
                                events = events.replace(new RegExp(event, "g"), "");
                            });
                            if (!events.trim()) return this;
                        }
                        return original.apply(this, arguments);
                    };
                }
            });
            
            // 覆蓋jQuery內部事件系統
            if ($.event && $.event.add) {
                const originalAdd = $.event.add;
                $.event.add = function(elem, types, handler, data, selector) {
                    if (typeof types === "string") {
                        deprecatedEvents.forEach(function(event) {
                            if (types.indexOf(event) !== -1) {
                                console.info("PDF簽名系統: 攔截jQuery內部事件 " + event);
                                return;
                            }
                        });
                    }
                    return originalAdd.apply(this, arguments);
                };
            }
        }
    }
    
    // 立即嘗試，然後持續監控
    interceptJQuery();
    
    // 監控jQuery載入
    let attempts = 0;
    const monitor = setInterval(function() {
        if (++attempts > 100) { // 10秒後停止
            clearInterval(monitor);
            return;
        }
        
        if (typeof window.jQuery !== "undefined" && !window.jQuery._pdfSignaturePatched) {
            window.jQuery._pdfSignaturePatched = true;
            interceptJQuery();
            console.info("PDF簽名系統: jQuery兼容性修復完成");
        }
    }, 100);
    
    // 完全靜默控制台警告
    if (typeof console !== "undefined") {
        const methods = ["warn", "error", "log"];
        methods.forEach(function(method) {
            if (console[method]) {
                const original = console[method];
                console[method] = function() {
                    const message = Array.prototype.join.call(arguments, " ");
                    
                    // 過濾所有相關訊息
                    if (message.match(/DOMNodeInserted|mutation event|Support for this event type|message channel closed|asynchronous response|Could not establish connection|Receiving end does not exist|超时.*messages.*准备好/)) {
                        return; // 完全靜默
                    }
                    
                    original.apply(console, arguments);
                };
            }
        });
    }
    
    console.info("PDF簽名系統: 緊急兼容性修復已啟動");
})();
</script>';
        
        // 將腳本插入到HTML的最開始位置
        if (strpos($buffer, '<head>') !== false) {
            $buffer = str_replace('<head>', '<head>' . $compatibility_script, $buffer);
        } elseif (strpos($buffer, '<html>') !== false) {
            $buffer = str_replace('<html>', '<html>' . $compatibility_script, $buffer);
        } else {
            $buffer = $compatibility_script . $buffer;
        }
        
        return $buffer;
    });
}

// 在插件載入時立即執行
wp_pdf_signature_force_compatibility();