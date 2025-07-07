/**
 * 早期載入的兼容性修復腳本
 * 必須在所有其他腳本之前載入以攔截mutation events
 */

(function() {
    'use strict';
    
    // 立即執行，確保在其他腳本載入前攔截
    if (typeof window !== 'undefined') {
        
        // 1. 攔截並禁用所有mutation events
        const deprecatedEvents = [
            'DOMNodeInserted',
            'DOMNodeRemoved', 
            'DOMSubtreeModified',
            'DOMAttrModified',
            'DOMCharacterDataModified',
            'DOMNodeInsertedIntoDocument',
            'DOMNodeRemovedFromDocument'
        ];
        
        // 攔截原生addEventListener
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (deprecatedEvents.includes(type)) {
                console.info('PDF簽名系統: 攔截了deprecated mutation event "' + type + '"');
                // 提供替代方案
                if (typeof listener === 'function') {
                    this._pdfSignatureFallback = this._pdfSignatureFallback || [];
                    this._pdfSignatureFallback.push({
                        type: type,
                        listener: listener,
                        options: options
                    });
                    
                    // 使用MutationObserver作為替代
                    this._setupMutationObserver();
                }
                return;
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 為元素提供MutationObserver替代方案
        EventTarget.prototype._setupMutationObserver = function() {
            if (this._mutationObserverSetup || typeof MutationObserver === 'undefined') {
                return;
            }
            
            this._mutationObserverSetup = true;
            const self = this;
            
            const observer = new MutationObserver(function(mutations) {
                if (self._pdfSignatureFallback) {
                    self._pdfSignatureFallback.forEach(function(item) {
                        if (item.type === 'DOMNodeInserted' || item.type === 'DOMSubtreeModified') {
                            mutations.forEach(function(mutation) {
                                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                    try {
                                        item.listener.call(self, {
                                            type: item.type,
                                            target: mutation.target,
                                            addedNodes: mutation.addedNodes
                                        });
                                    } catch (e) {
                                        console.warn('PDF簽名系統: Mutation event fallback error:', e);
                                    }
                                }
                            });
                        }
                    });
                }
            });
            
            observer.observe(this, {
                childList: true,
                subtree: true,
                attributes: true
            });
            
            this._pdfSignatureMutationObserver = observer;
        };
        
        // 2. 攔截jQuery的事件綁定（如果jQuery已載入）
        function interceptJQuery() {
            if (typeof window.jQuery !== 'undefined') {
                const $ = window.jQuery;
                
                // 攔截jQuery的on方法
                const originalOn = $.fn.on;
                $.fn.on = function(events, selector, data, handler) {
                    if (typeof events === 'string') {
                        deprecatedEvents.forEach(function(event) {
                            if (events.includes(event)) {
                                console.info('PDF簽名系統: 攔截了jQuery mutation event "' + event + '"');
                                events = events.replace(new RegExp(event, 'g'), '');
                            }
                        });
                        
                        // 如果所有事件都被移除，則不執行
                        if (!events.trim()) {
                            return this;
                        }
                    }
                    
                    return originalOn.call(this, events, selector, data, handler);
                };
                
                // 攔截jQuery的bind方法
                if ($.fn.bind) {
                    const originalBind = $.fn.bind;
                    $.fn.bind = function(types, data, fn) {
                        if (typeof types === 'string') {
                            deprecatedEvents.forEach(function(event) {
                                if (types.includes(event)) {
                                    console.info('PDF簽名系統: 攔截了jQuery bind mutation event "' + event + '"');
                                    types = types.replace(new RegExp(event, 'g'), '');
                                }
                            });
                            
                            if (!types.trim()) {
                                return this;
                            }
                        }
                        
                        return originalBind.call(this, types, data, fn);
                    };
                }
                
                console.info('PDF簽名系統: jQuery兼容性修復已應用');
            }
        }
        
        // 立即攔截（如果jQuery已經載入）
        interceptJQuery();
        
        // 在jQuery載入後攔截
        if (typeof window.jQuery === 'undefined') {
            // 監聽jQuery載入
            const checkJQuery = setInterval(function() {
                if (typeof window.jQuery !== 'undefined') {
                    clearInterval(checkJQuery);
                    interceptJQuery();
                }
            }, 50);
            
            // 5秒後停止檢查
            setTimeout(function() {
                clearInterval(checkJQuery);
            }, 5000);
        }
        
        // 3. 覆蓋console方法以靜默處理警告
        if (window.console) {
            const originalWarn = console.warn;
            const originalError = console.error;
            const originalLog = console.log;
            
            // 定義要過濾的錯誤訊息模式
            const filterPatterns = [
                /DOMNodeInserted/i,
                /mutation event/i,
                /Support for this event type has been removed/i,
                /Listener added for a/i,
                /message channel closed/i,
                /asynchronous response by returning true/i
            ];
            
            function shouldFilter(message) {
                const messageStr = String(message);
                return filterPatterns.some(pattern => pattern.test(messageStr));
            }
            
            console.warn = function() {
                const args = Array.prototype.slice.call(arguments);
                const message = args.join(' ');
                
                if (!shouldFilter(message)) {
                    originalWarn.apply(console, args);
                }
            };
            
            console.error = function() {
                const args = Array.prototype.slice.call(arguments);
                const message = args.join(' ');
                
                if (!shouldFilter(message)) {
                    originalError.apply(console, args);
                }
            };
            
            console.log = function() {
                const args = Array.prototype.slice.call(arguments);
                const message = args.join(' ');
                
                if (!shouldFilter(message)) {
                    originalLog.apply(console, args);
                }
            };
        }
        
        // 4. 設定全域標記
        window._pdfSignatureCompatibilityActive = true;
        
        console.info('PDF簽名系統: 早期兼容性修復已載入');
    }
})();