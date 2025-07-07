<?php
/**
 * 超早期修復 - 在WordPress完全載入前就開始工作
 */

// 檢查是否在WordPress環境中
if (!defined('ABSPATH')) {
    exit;
}

// 使用WordPress最早的hook
add_action('plugins_loaded', 'wp_pdf_signature_super_early_fix', -PHP_INT_MAX);
add_action('after_setup_theme', 'wp_pdf_signature_super_early_fix', -PHP_INT_MAX);

function wp_pdf_signature_super_early_fix() {
    // 防止重複執行
    static $executed = false;
    if ($executed) return;
    $executed = true;
    
    // 直接輸出到頁面頭部
    add_action('wp_head', function() {
        ?>
        <script>
        // PDF簽名系統 - 超早期修復
        (function() {
            if (window._pdfSigSuperFix) return;
            window._pdfSigSuperFix = true;
            
            // 完全替換addEventListener
            if (typeof EventTarget !== 'undefined') {
                const orig = EventTarget.prototype.addEventListener;
                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    if (/(DOMNode|DOMSubtree|DOMAttr|DOMCharacter)/.test(type)) {
                        return; // 完全忽略
                    }
                    return orig.call(this, type, listener, options);
                };
            }
            
            // 攔截console方法
            ['warn', 'error', 'log'].forEach(function(method) {
                if (console[method]) {
                    const orig = console[method];
                    console[method] = function() {
                        const msg = Array.prototype.join.call(arguments, ' ');
                        if (!/DOMNode|mutation.*event|message.*channel.*closed|asynchronous.*response|Could.*not.*establish|Receiving.*end.*does.*not|超时.*messages/i.test(msg)) {
                            orig.apply(console, arguments);
                        }
                    };
                }
            });
            
            console.info('PDF簽名系統: 超早期修復完成');
        })();
        </script>
        <?php
    }, 1);
    
    add_action('admin_head', function() {
        ?>
        <script>
        // PDF簽名系統 - 管理員頁面修復
        (function() {
            if (window._pdfSigAdminFix) return;
            window._pdfSigAdminFix = true;
            
            // 同樣的修復邏輯
            if (typeof EventTarget !== 'undefined') {
                const orig = EventTarget.prototype.addEventListener;
                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    if (/(DOMNode|DOMSubtree|DOMAttr|DOMCharacter)/.test(type)) {
                        return;
                    }
                    return orig.call(this, type, listener, options);
                };
            }
            
            ['warn', 'error', 'log'].forEach(function(method) {
                if (console[method]) {
                    const orig = console[method];
                    console[method] = function() {
                        const msg = Array.prototype.join.call(arguments, ' ');
                        if (!/DOMNode|mutation.*event|message.*channel.*closed|asynchronous.*response|Could.*not.*establish|Receiving.*end.*does.*not|超时.*messages/i.test(msg)) {
                            orig.apply(console, arguments);
                        }
                    };
                }
            });
        })();
        </script>
        <?php
    }, 1);
}

// 嘗試更早的輸出
if (!defined('WP_PDF_SIGNATURE_EMERGENCY_OUTPUT')) {
    define('WP_PDF_SIGNATURE_EMERGENCY_OUTPUT', true);
    
    // 如果我們在WordPress環境中，嘗試立即輸出
    if (defined('ABSPATH')) {
        ob_start(function($buffer) {
            $emergency_script = '
<script>
/* PDF簽名系統 - 緊急輸出修復 */
if (!window._pdfSigEmergency) {
    window._pdfSigEmergency = true;
    
    // 立即攔截
    if (typeof EventTarget !== "undefined") {
        const orig = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type && type.match(/DOMNode|DOMSubtree|DOMAttr|DOMCharacter/)) {
                return; // 忽略
            }
            return orig.call(this, type, listener, options);
        };
    }
    
    // 立即靜默控制台
    if (typeof console !== "undefined") {
        ["warn", "error", "log"].forEach(function(method) {
            if (console[method]) {
                const orig = console[method];
                console[method] = function() {
                    const msg = Array.prototype.join.call(arguments, " ");
                    if (!msg.match(/DOMNode|mutation.*event|message.*channel|asynchronous.*response|Could.*not.*establish|Receiving.*end|超时.*messages/i)) {
                        orig.apply(console, arguments);
                    }
                };
            }
        });
    }
}
</script>';
            
            // 嘗試插入到最早的位置
            if (strpos($buffer, '<html') !== false) {
                $buffer = preg_replace('/(<html[^>]*>)/i', '$1' . $emergency_script, $buffer);
            } elseif (strpos($buffer, '<head') !== false) {
                $buffer = preg_replace('/(<head[^>]*>)/i', '$1' . $emergency_script, $buffer);
            } else {
                $buffer = $emergency_script . $buffer;
            }
            
            return $buffer;
        });
    }
}
?>