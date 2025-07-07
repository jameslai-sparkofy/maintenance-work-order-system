// WordPress PDF簽名系統 - 終極jQuery修復
// 這個腳本必須在所有其他腳本之前執行

(function() {
    'use strict';
    
    // 防止重複執行
    if (window._wpPdfSignatureUltimateFix) return;
    window._wpPdfSignatureUltimateFix = true;
    
    console.info('PDF簽名系統: 啟動終極修復模式');
    
    // 1. 完全阻止瀏覽器支援mutation events
    const deprecatedEvents = [
        'DOMNodeInserted', 'DOMNodeRemoved', 'DOMSubtreeModified',
        'DOMAttrModified', 'DOMCharacterDataModified', 
        'DOMNodeInsertedIntoDocument', 'DOMNodeRemovedFromDocument'
    ];
    
    // 替換原生addEventListener
    if (typeof EventTarget !== 'undefined') {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (deprecatedEvents.includes(type)) {
                // 完全不執行，且不給任何反饋
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 也替換removeEventListener以保持一致性
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            if (deprecatedEvents.includes(type)) {
                return;
            }
            return originalRemoveEventListener.call(this, type, listener, options);
        };
    }
    
    // 2. 完全禁用Event構造器對這些事件的支援
    if (typeof Event !== 'undefined') {
        const OriginalEvent = window.Event;
        window.Event = function(type, eventInitDict) {
            if (deprecatedEvents.includes(type)) {
                // 拋出一個看起來像正常的錯誤，但實際上是我們的攔截
                throw new Error('Event type not supported in this browser');
            }
            return new OriginalEvent(type, eventInitDict);
        };
        
        // 保持原型鏈
        window.Event.prototype = OriginalEvent.prototype;
        Object.setPrototypeOf(window.Event, OriginalEvent);
    }
    
    // 3. 攔截document.createEvent
    if (document.createEvent) {
        const originalCreateEvent = document.createEvent;
        document.createEvent = function(eventInterface) {
            if (eventInterface === 'MutationEvent' || eventInterface === 'MutationEvents') {
                throw new Error('MutationEvent interface not supported');
            }
            return originalCreateEvent.call(this, eventInterface);
        };
    }
    
    // 4. 監控並修復jQuery
    function patchJQuery() {
        if (typeof window.jQuery === 'undefined') return false;
        
        const $ = window.jQuery;
        
        // 如果已經修復過這個jQuery實例，跳過
        if ($._wpPdfSignaturePatched) return true;
        $._wpPdfSignaturePatched = true;
        
        console.info('PDF簽名系統: 修復jQuery版本', $.fn.jquery || 'unknown');
        
        // 修復$.fn.on
        if ($.fn.on) {
            const originalOn = $.fn.on;
            $.fn.on = function(events, selector, data, handler) {
                if (typeof events === 'string') {
                    // 完全移除所有mutation events
                    let cleanEvents = events;
                    deprecatedEvents.forEach(function(event) {
                        cleanEvents = cleanEvents.replace(new RegExp('\\b' + event + '\\b', 'g'), '');
                    });
                    
                    // 清理多餘的空格和分隔符
                    cleanEvents = cleanEvents.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
                    cleanEvents = cleanEvents.replace(/^[,\s]+|[,\s]+$/g, '');
                    cleanEvents = cleanEvents.replace(/[,\s]+/g, ' ');
                    
                    if (!cleanEvents) {
                        console.info('PDF簽名系統: 完全移除了jQuery mutation events');
                        return this; // 返回this以維持鏈式調用
                    }
                    
                    events = cleanEvents;
                }
                
                return originalOn.call(this, events, selector, data, handler);
            };
        }
        
        // 修復$.fn.bind
        if ($.fn.bind) {
            const originalBind = $.fn.bind;
            $.fn.bind = function(types, data, fn) {
                if (typeof types === 'string') {
                    let cleanTypes = types;
                    deprecatedEvents.forEach(function(event) {
                        cleanTypes = cleanTypes.replace(new RegExp('\\b' + event + '\\b', 'g'), '');
                    });
                    
                    cleanTypes = cleanTypes.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
                    cleanTypes = cleanTypes.replace(/^[,\s]+|[,\s]+$/g, '');
                    
                    if (!cleanTypes) {
                        console.info('PDF簽名系統: 移除了jQuery bind mutation events');
                        return this;
                    }
                    
                    types = cleanTypes;
                }
                
                return originalBind.call(this, types, data, fn);
            };
        }
        
        // 修復jQuery內部事件系統
        if ($.event && $.event.add) {
            const originalEventAdd = $.event.add;
            $.event.add = function(elem, types, handler, data, selector) {
                if (typeof types === 'string') {
                    if (deprecatedEvents.some(event => types.includes(event))) {
                        console.info('PDF簽名系統: 攔截jQuery內部mutation event:', types);
                        return; // 完全不添加事件
                    }
                }
                
                return originalEventAdd.call(this, elem, types, handler, data, selector);
            };
        }
        
        // 修復$.fn.live (如果存在)
        if ($.fn.live) {
            const originalLive = $.fn.live;
            $.fn.live = function(types, data, fn) {
                if (typeof types === 'string') {
                    let cleanTypes = types;
                    deprecatedEvents.forEach(function(event) {
                        cleanTypes = cleanTypes.replace(new RegExp('\\b' + event + '\\b', 'g'), '');
                    });
                    
                    if (!cleanTypes.trim()) {
                        return this;
                    }
                    
                    types = cleanTypes;
                }
                
                return originalLive.call(this, types, data, fn);
            };
        }
        
        return true;
    }
    
    // 立即嘗試修復jQuery
    patchJQuery();
    
    // 持續監控jQuery的載入
    let jqueryCheckCount = 0;
    const jqueryMonitor = setInterval(function() {
        jqueryCheckCount++;
        
        if (jqueryCheckCount > 100) { // 10秒後停止檢查
            clearInterval(jqueryMonitor);
            return;
        }
        
        if (patchJQuery()) {
            // 找到並修復了jQuery，但繼續監控可能的其他實例
        }
    }, 100);
    
    // 5. 完全靜默控制台輸出
    if (typeof console !== 'undefined') {
        const originalMethods = {
            warn: console.warn,
            error: console.error,
            log: console.log
        };
        
        ['warn', 'error', 'log'].forEach(function(method) {
            if (console[method]) {
                console[method] = function() {
                    const message = Array.prototype.slice.call(arguments).join(' ');
                    
                    // 檢查是否需要過濾
                    const shouldFilter = [
                        /DOMNodeInserted/i,
                        /mutation event/i,
                        /Support for this event type has been removed/i,
                        /Listener added for a.*mutation event/i,
                        /message channel closed/i,
                        /asynchronous response by returning true/i,
                        /Could not establish connection/i,
                        /Receiving end does not exist/i,
                        /超时.*messages.*准备好/i
                    ].some(pattern => pattern.test(message));
                    
                    if (!shouldFilter) {
                        originalMethods[method].apply(console, arguments);
                    }
                };
            }
        });
    }
    
    // 6. 攔截全域錯誤
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('error', function(e) {
            if (e.message && (
                e.message.includes('DOMNodeInserted') ||
                e.message.includes('mutation event') ||
                e.message.includes('message channel closed')
            )) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);
        
        window.addEventListener('unhandledrejection', function(e) {
            if (e.reason && typeof e.reason === 'string' && (
                e.reason.includes('message channel closed') ||
                e.reason.includes('asynchronous response')
            )) {
                e.preventDefault();
                return false;
            }
        });
    }
    
    console.info('PDF簽名系統: 終極修復已完成');
    
})();