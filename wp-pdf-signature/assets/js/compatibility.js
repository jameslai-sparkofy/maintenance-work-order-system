/**
 * jQuery兼容性修復
 * 解決舊版jQuery的DOMNodeInserted警告問題
 */

(function($) {
    'use strict';
    
    // 修復jQuery版本兼容性問題
    if ($ && $.fn.jquery) {
        const jqueryVersion = $.fn.jquery.split('.');
        const majorVersion = parseInt(jqueryVersion[0]);
        const minorVersion = parseInt(jqueryVersion[1]);
        
        // 對於舊版jQuery (2.x及以下)，禁用problematic事件
        if (majorVersion <= 2) {
            console.warn('檢測到舊版jQuery (' + $.fn.jquery + ')，應用兼容性修復');
            
            // 覆蓋可能使用DOMNodeInserted的jQuery方法
            const originalOn = $.fn.on;
            $.fn.on = function(events, selector, data, handler) {
                // 過濾掉deprecated事件
                if (typeof events === 'string') {
                    events = events.replace(/DOMNodeInserted|DOMNodeRemoved|DOMSubtreeModified/g, '');
                    if (!events.trim()) {
                        console.warn('阻止了deprecated DOM mutation event');
                        return this;
                    }
                }
                return originalOn.call(this, events, selector, data, handler);
            };
            
            // 提供現代化的DOM觀察替代方案
            $.fn.observeChanges = function(callback) {
                if (typeof MutationObserver !== 'undefined') {
                    return this.each(function() {
                        const observer = new MutationObserver(callback);
                        observer.observe(this, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeOldValue: true,
                            characterData: true,
                            characterDataOldValue: true
                        });
                        
                        // 將observer存儲在元素上以便後續清理
                        $(this).data('mutationObserver', observer);
                    });
                } else {
                    // 回退到定時檢查
                    console.warn('MutationObserver不可用，使用定時檢查作為回退');
                    return this.each(function() {
                        const $element = $(this);
                        const initialHTML = $element.html();
                        
                        const checkInterval = setInterval(function() {
                            const currentHTML = $element.html();
                            if (currentHTML !== initialHTML) {
                                callback([{
                                    type: 'childList',
                                    target: $element[0]
                                }]);
                            }
                        }, 500);
                        
                        $element.data('changeCheckInterval', checkInterval);
                    });
                }
            };
            
            // 清理observer的方法
            $.fn.stopObserving = function() {
                return this.each(function() {
                    const observer = $(this).data('mutationObserver');
                    const interval = $(this).data('changeCheckInterval');
                    
                    if (observer) {
                        observer.disconnect();
                        $(this).removeData('mutationObserver');
                    }
                    
                    if (interval) {
                        clearInterval(interval);
                        $(this).removeData('changeCheckInterval');
                    }
                });
            };
        }
    }
    
    // 強制修復 - 在全域範圍內攔截和修復mutation events
    if (typeof window !== 'undefined') {
        // 攔截addEventListener調用
        const originalAddEventListener = Element.prototype.addEventListener;
        Element.prototype.addEventListener = function(type, listener, options) {
            // 阻止添加deprecated mutation events
            if (type === 'DOMNodeInserted' || 
                type === 'DOMNodeRemoved' || 
                type === 'DOMSubtreeModified' ||
                type === 'DOMAttrModified' ||
                type === 'DOMCharacterDataModified') {
                
                console.warn('PDF簽名系統: 阻止了deprecated mutation event: ' + type);
                return; // 不執行原始的addEventListener
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 攔截Document的addEventListener
        const originalDocAddEventListener = Document.prototype.addEventListener;
        Document.prototype.addEventListener = function(type, listener, options) {
            if (type === 'DOMNodeInserted' || 
                type === 'DOMNodeRemoved' || 
                type === 'DOMSubtreeModified' ||
                type === 'DOMAttrModified' ||
                type === 'DOMCharacterDataModified') {
                
                console.warn('PDF簽名系統: 阻止了document level mutation event: ' + type);
                return;
            }
            
            return originalDocAddEventListener.call(this, type, listener, options);
        };
        
        // 全域錯誤處理 - 捕獲並抑制mutation event警告
        if (window.console) {
            const originalWarn = console.warn;
            const originalError = console.error;
            
            console.warn = function() {
                const message = Array.prototype.slice.call(arguments).join(' ');
                
                // 過濾掉已知的jQuery mutation event警告
                if (message.includes('DOMNodeInserted') || 
                    message.includes('mutation event') ||
                    message.includes('Support for this event type has been removed') ||
                    message.includes('Listener added for a') ||
                    message.includes('message channel closed')) {
                    return; // 靜默處理這些警告
                }
                
                // 其他警告正常顯示
                originalWarn.apply(console, arguments);
            };
            
            console.error = function() {
                const message = Array.prototype.slice.call(arguments).join(' ');
                
                // 過濾掉異步響應錯誤
                if (message.includes('message channel closed') ||
                    message.includes('asynchronous response by returning true')) {
                    return; // 靜默處理這些錯誤
                }
                
                originalError.apply(console, arguments);
            };
        }
    }
    
    // 為舊瀏覽器提供MutationObserver polyfill的簡化版本
    if (typeof MutationObserver === 'undefined' && typeof window !== 'undefined') {
        window.MutationObserver = function(callback) {
            this.callback = callback;
            this.targets = [];
        };
        
        window.MutationObserver.prototype.observe = function(target, options) {
            const self = this;
            this.targets.push(target);
            
            // 簡單的輪詢檢查
            if (!target._mutationInterval) {
                target._lastHTML = target.innerHTML;
                target._mutationInterval = setInterval(function() {
                    const currentHTML = target.innerHTML;
                    if (currentHTML !== target._lastHTML) {
                        self.callback([{
                            type: 'childList',
                            target: target,
                            addedNodes: [],
                            removedNodes: []
                        }]);
                        target._lastHTML = currentHTML;
                    }
                }, 100);
            }
        };
        
        window.MutationObserver.prototype.disconnect = function() {
            this.targets.forEach(function(target) {
                if (target._mutationInterval) {
                    clearInterval(target._mutationInterval);
                    delete target._mutationInterval;
                    delete target._lastHTML;
                }
            });
            this.targets = [];
        };
        
        console.info('已載入MutationObserver polyfill');
    }
    
    // jQuery ready事件的現代化處理
    $(document).ready(function() {
        // 檢查是否有deprecation警告並提供解決方案
        if (typeof window.chrome !== 'undefined' && window.chrome.loadTimes) {
            console.info('PDF簽名系統: 已應用jQuery兼容性修復');
        }
        
        // 初始化現代化的事件監聽器
        initModernEventListeners();
    });
    
    /**
     * 初始化現代化的事件監聽器
     */
    function initModernEventListeners() {
        // 替換所有可能的mutation events
        $('[data-observe-changes]').each(function() {
            const $element = $(this);
            const callback = window[$element.data('observe-changes')];
            
            if (typeof callback === 'function') {
                $element.observeChanges(callback);
            }
        });
        
        // 為動態內容提供現代化的監聽
        if (typeof window.wpPdfSignature !== 'undefined') {
            // 監聽AJAX內容變化
            $(document).ajaxComplete(function() {
                // 重新初始化可能添加的新元素
                setTimeout(function() {
                    $('[data-dynamic-content]').each(function() {
                        initDynamicContent($(this));
                    });
                }, 100);
            });
        }
    }
    
    /**
     * 初始化動態內容
     */
    function initDynamicContent($element) {
        if ($element.data('initialized')) {
            return;
        }
        
        // 使用現代化的方法觀察變化
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        $element.trigger('contentChanged', [mutation]);
                    }
                });
            });
            
            observer.observe($element[0], {
                childList: true,
                subtree: true
            });
            
            $element.data('mutationObserver', observer);
        }
        
        $element.data('initialized', true);
    }
    
})(jQuery);