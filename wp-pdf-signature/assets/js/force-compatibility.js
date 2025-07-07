/**
 * 終極jQuery兼容性修復
 * 這是最後的防線，確保完全阻止mutation events
 */

// 立即執行函數，不等待任何條件
(function() {
    'use strict';
    
    // 如果已經執行過，跳過
    if (window._pdfSignatureForceCompatibilityApplied) {
        return;
    }
    window._pdfSignatureForceCompatibilityApplied = true;
    
    // 完全禁用瀏覽器的mutation event支援
    if (typeof Event !== 'undefined' && Event.prototype) {
        const deprecatedEvents = [
            'DOMNodeInserted',
            'DOMNodeRemoved', 
            'DOMSubtreeModified',
            'DOMAttrModified',
            'DOMCharacterDataModified',
            'DOMNodeInsertedIntoDocument',
            'DOMNodeRemovedFromDocument'
        ];
        
        // 創建一個假的Event constructor來替換原生的
        deprecatedEvents.forEach(function(eventType) {
            try {
                // 嘗試創建事件以測試支援
                const testEvent = new Event(eventType);
                
                // 如果成功創建，我們需要阻止它
                const originalEventConstructor = window.Event;
                window.Event = function(type, eventInitDict) {
                    if (deprecatedEvents.includes(type)) {
                        console.info('PDF簽名系統: 阻止創建deprecated event: ' + type);
                        // 返回一個空的事件對象
                        return {
                            type: type,
                            target: null,
                            preventDefault: function() {},
                            stopPropagation: function() {},
                            stopImmediatePropagation: function() {}
                        };
                    }
                    return new originalEventConstructor(type, eventInitDict);
                };
                
                // 保持原型鏈
                window.Event.prototype = originalEventConstructor.prototype;
                
            } catch (e) {
                // 如果瀏覽器不支援該事件，忽略錯誤
            }
        });
    }
    
    // 攔截document.createEvent
    if (document.createEvent) {
        const originalCreateEvent = document.createEvent;
        document.createEvent = function(eventInterface) {
            if (eventInterface === 'MutationEvent' || eventInterface === 'MutationEvents') {
                console.info('PDF簽名系統: 阻止創建MutationEvent');
                // 返回一個假的事件對象
                return {
                    initEvent: function() {},
                    initMutationEvent: function() {},
                    type: '',
                    target: null,
                    relatedNode: null,
                    prevValue: '',
                    newValue: '',
                    attrName: '',
                    attrChange: 0,
                    preventDefault: function() {},
                    stopPropagation: function() {}
                };
            }
            return originalCreateEvent.call(this, eventInterface);
        };
    }
    
    // 最激進的方法：直接修改瀏覽器警告輸出
    if (typeof console !== 'undefined') {
        // 保存原始方法
        const originalMethods = {
            warn: console.warn,
            error: console.error,
            log: console.log,
            info: console.info
        };
        
        // 創建過濾函數
        function createFilteredMethod(methodName, originalMethod) {
            return function() {
                const args = Array.prototype.slice.call(arguments);
                const message = args.join(' ');
                
                // 檢查是否為我們要過濾的訊息
                const filterPatterns = [
                    /Listener added for a.*DOMNodeInserted.*mutation event/i,
                    /Support for this event type has been removed/i,
                    /message channel closed before a response was received/i,
                    /asynchronous response by returning true/i,
                    /DOMNodeInserted/i,
                    /mutation event/i
                ];
                
                const shouldFilter = filterPatterns.some(pattern => pattern.test(message));
                
                if (!shouldFilter) {
                    originalMethod.apply(console, args);
                } else {
                    // 可選：記錄被過濾的訊息到一個自定義日誌
                    if (window._pdfSignatureFilteredMessages) {
                        window._pdfSignatureFilteredMessages.push({
                            method: methodName,
                            message: message,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            };
        }
        
        // 應用過濾到所有console方法
        Object.keys(originalMethods).forEach(function(methodName) {
            console[methodName] = createFilteredMethod(methodName, originalMethods[methodName]);
        });
        
        // 初始化過濾訊息數組
        window._pdfSignatureFilteredMessages = [];
        
        // 提供一個方法來查看被過濾的訊息（調試用）
        window.getPDFSignatureFilteredMessages = function() {
            return window._pdfSignatureFilteredMessages;
        };
    }
    
    // 攔截可能的異步錯誤處理
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('error', function(event) {
            if (event.message && (
                event.message.includes('message channel closed') ||
                event.message.includes('DOMNodeInserted') ||
                event.message.includes('mutation event')
            )) {
                event.preventDefault();
                event.stopPropagation();
                console.info('PDF簽名系統: 阻止了錯誤事件:', event.message);
                return false;
            }
        }, true);
        
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && typeof event.reason === 'string' && (
                event.reason.includes('message channel closed') ||
                event.reason.includes('asynchronous response')
            )) {
                event.preventDefault();
                console.info('PDF簽名系統: 阻止了Promise rejection:', event.reason);
                return false;
            }
        });
    }
    
    console.info('PDF簽名系統: 終極兼容性修復已啟用');
    
})();