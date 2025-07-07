/**
 * 前台JavaScript功能
 */

(function($) {
    'use strict';
    
    // 全域變數
    let pdfDoc = null;
    let pageNum = 1;
    let pageIsRendering = false;
    let pageNumIsPending = null;
    let scale = 1.0;
    let canvas = null;
    let ctx = null;
    let signatureFields = [];
    let signaturePad = null;
    let isSubmitting = false;
    
    // 頁面載入完成後初始化
    $(document).ready(function() {
        init();
    });
    
    /**
     * 初始化功能
     */
    function init() {
        if (typeof pdfSignatureData !== 'undefined') {
            setupPdfViewer();
            setupSignaturePad();
            setupForm();
            setupPageControls();
            
            // 如果文件已簽名，不需要載入PDF編輯功能
            if (pdfSignatureData.status !== 'signed') {
                loadPdfDocument();
            }
        }
    }
    
    /**
     * 設定PDF檢視器
     */
    function setupPdfViewer() {
        canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;
        
        ctx = canvas.getContext('2d');
        
        // 設定PDF.js工作線程
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = wpPdfSignaturePublic.strings.workerSrc || 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.js';
        }
    }
    
    /**
     * 載入PDF文件
     */
    function loadPdfDocument() {
        if (!pdfSignatureData.pdfUrl) {
            showError(wpPdfSignaturePublic.strings.documentNotFound);
            return;
        }
        
        showLoading(true);
        
        pdfjsLib.getDocument(pdfSignatureData.pdfUrl).promise.then(function(pdf) {
            pdfDoc = pdf;
            $('#page-count').text(pdf.numPages);
            
            renderPage(pageNum);
            loadSignatureFields();
            
        }).catch(function(error) {
            console.error('PDF載入失敗:', error);
            showError(wpPdfSignaturePublic.strings.documentNotFound);
        }).finally(function() {
            showLoading(false);
        });
    }
    
    /**
     * 渲染PDF頁面
     */
    function renderPage(num) {
        pageIsRendering = true;
        $('#page-num').text(num);
        
        pdfDoc.getPage(num).then(function(page) {
            // 計算適合的縮放比例
            const container = $('.pdf-viewer');
            const containerWidth = container.width() - 40; // 減去padding
            const viewport = page.getViewport({ scale: 1.0 });
            scale = Math.min(containerWidth / viewport.width, 1.5);
            
            const scaledViewport = page.getViewport({ scale: scale });
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport
            };
            
            const renderTask = page.render(renderContext);
            
            renderTask.promise.then(function() {
                pageIsRendering = false;
                
                if (pageNumIsPending !== null) {
                    renderPage(pageNumIsPending);
                    pageNumIsPending = null;
                }
                
                // 重新載入簽名欄位
                displaySignatureFields();
                updatePageControls();
            });
        });
    }
    
    /**
     * 載入簽名欄位
     */
    function loadSignatureFields() {
        if (pdfSignatureData.signatureFields) {
            signatureFields = pdfSignatureData.signatureFields;
            displaySignatureFields();
        }
    }
    
    /**
     * 顯示簽名欄位
     */
    function displaySignatureFields() {
        const overlay = $('#signature-fields-overlay');
        overlay.empty();
        
        signatureFields.forEach(function(field, index) {
            // 調整欄位位置和大小以適應當前縮放比例
            const fieldDiv = $('<div>')
                .addClass('signature-field-marker')
                .attr('data-field-id', field.id)
                .attr('data-field-type', field.field_type)
                .css({
                    left: (field.field_position.x * scale) + 'px',
                    top: (field.field_position.y * scale) + 'px',
                    width: (field.field_size.width * scale) + 'px',
                    height: (field.field_size.height * scale) + 'px'
                });
            
            const label = $('<div>')
                .addClass('signature-field-label')
                .text(field.field_name);
                
            fieldDiv.append(label);
            overlay.append(fieldDiv);
            
            // 為簽名欄位添加點擊事件
            if (field.field_type === 'signature') {
                fieldDiv.on('click', function() {
                    scrollToSignatureForm();
                    highlightSignatureField($(this));
                });
            }
        });
    }
    
    /**
     * 設定簽名板
     */
    function setupSignaturePad() {
        const signatureCanvas = document.getElementById('signature-pad');
        if (!signatureCanvas) return;
        
        signaturePad = new SignaturePad(signatureCanvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: wpPdfSignaturePublic.signatureColor || '#000000',
            minWidth: 1,
            maxWidth: parseInt(wpPdfSignaturePublic.signatureWidth) || 3,
            throttle: 16,
            minDistance: 5
        });
        
        // 調整畫布大小
        resizeSignaturePad();
        
        // 清除簽名按鈕
        $('#clear-signature').on('click', function() {
            signaturePad.clear();
            $(this).blur();
        });
        
        // 視窗大小改變時調整畫布
        $(window).on('resize', debounce(resizeSignaturePad, 250));
    }
    
    /**
     * 調整簽名板大小
     */
    function resizeSignaturePad() {
        if (!signaturePad) return;
        
        const canvas = signaturePad.canvas;
        const container = $(canvas).parent();
        
        // 保存當前簽名數據
        const signatureData = signaturePad.toData();
        
        // 設定新的canvas大小
        canvas.width = container.width();
        canvas.height = 200;
        
        // 恢復簽名數據
        signaturePad.fromData(signatureData);
    }
    
    /**
     * 設定表單提交
     */
    function setupForm() {
        const form = $('#signature-form');
        
        form.on('submit', function(e) {
            e.preventDefault();
            
            if (isSubmitting) return;
            
            if (validateForm()) {
                submitSignature();
            }
        });
        
        // 即時驗證
        $('#signer-name, #signer-email').on('blur', validateField);
        
        // 同意條款檢查
        $('#agree-terms').on('change', function() {
            updateSubmitButton();
        });
    }
    
    /**
     * 驗證表單
     */
    function validateForm() {
        let isValid = true;
        const errors = [];
        
        // 驗證姓名
        const name = $('#signer-name').val().trim();
        if (!name) {
            errors.push(wpPdfSignaturePublic.strings.nameRequired);
            $('#signer-name').addClass('error');
            isValid = false;
        } else {
            $('#signer-name').removeClass('error');
        }
        
        // 驗證電子郵件
        const email = $('#signer-email').val().trim();
        if (!email) {
            errors.push(wpPdfSignaturePublic.strings.emailRequired);
            $('#signer-email').addClass('error');
            isValid = false;
        } else if (!isValidEmail(email)) {
            errors.push(wpPdfSignaturePublic.strings.emailInvalid);
            $('#signer-email').addClass('error');
            isValid = false;
        } else {
            $('#signer-email').removeClass('error');
        }
        
        // 驗證簽名
        if (!signaturePad || signaturePad.isEmpty()) {
            errors.push(wpPdfSignaturePublic.strings.signatureRequired);
            $('.signature-pad-container').addClass('error');
            isValid = false;
        } else {
            $('.signature-pad-container').removeClass('error');
        }
        
        // 驗證同意條款
        if (!$('#agree-terms').is(':checked')) {
            errors.push('請同意簽名條款');
            isValid = false;
        }
        
        // 顯示錯誤訊息
        if (errors.length > 0) {
            showError(errors.join('<br>'));
        }
        
        return isValid;
    }
    
    /**
     * 驗證單個欄位
     */
    function validateField() {
        const field = $(this);
        const value = field.val().trim();
        
        if (field.attr('id') === 'signer-email' && value) {
            if (isValidEmail(value)) {
                field.removeClass('error');
            } else {
                field.addClass('error');
            }
        } else if (value) {
            field.removeClass('error');
        }
        
        updateSubmitButton();
    }
    
    /**
     * 提交簽名
     */
    function submitSignature() {
        if (isSubmitting) return;
        
        isSubmitting = true;
        const submitButton = $('#submit-signature');
        
        // 更新按鈕狀態
        submitButton.prop('disabled', true)
                   .addClass('loading')
                   .text(wpPdfSignaturePublic.strings.submitting);
        
        // 準備簽名數據
        const signatureData = signaturePad.toDataURL('image/png');
        const signaturePosition = getSignaturePosition();
        
        // 提交數據
        $.ajax({
            url: wpPdfSignaturePublic.ajaxUrl,
            type: 'POST',
            data: {
                action: 'submit_signature',
                nonce: wpPdfSignaturePublic.submitNonce,
                document_id: pdfSignatureData.documentId,
                signature_data: signatureData,
                signer_name: $('#signer-name').val().trim(),
                signer_email: $('#signer-email').val().trim(),
                signature_position: JSON.stringify(signaturePosition)
            },
            success: function(response) {
                if (response.success) {
                    showSuccess(wpPdfSignaturePublic.strings.submitSuccess);
                    
                    // 重新載入頁面顯示完成狀態
                    setTimeout(function() {
                        window.location.reload();
                    }, 2000);
                    
                } else {
                    showError(response.data || wpPdfSignaturePublic.strings.submitError);
                }
            },
            error: function() {
                showError(wpPdfSignaturePublic.strings.submitError);
            },
            complete: function() {
                isSubmitting = false;
                submitButton.prop('disabled', false)
                           .removeClass('loading')
                           .text(wpPdfSignaturePublic.strings.submitSignature);
            }
        });
    }
    
    /**
     * 獲取簽名位置資訊
     */
    function getSignaturePosition() {
        // 這裡可以實現更複雜的簽名位置邏輯
        // 目前返回簽名欄位的第一個位置
        if (signatureFields.length > 0) {
            const firstField = signatureFields.find(f => f.field_type === 'signature');
            if (firstField) {
                return {
                    page: pageNum,
                    x: firstField.field_position.x,
                    y: firstField.field_position.y,
                    width: firstField.field_size.width,
                    height: firstField.field_size.height
                };
            }
        }
        
        return {
            page: pageNum,
            x: 100,
            y: 100,
            width: 200,
            height: 60
        };
    }
    
    /**
     * 設定頁面控制
     */
    function setupPageControls() {
        $('#prev-page').on('click', function() {
            if (pageNum <= 1) return;
            
            pageNum--;
            queueRenderPage(pageNum);
        });
        
        $('#next-page').on('click', function() {
            if (pageNum >= pdfDoc.numPages) return;
            
            pageNum++;
            queueRenderPage(pageNum);
        });
    }
    
    /**
     * 排隊渲染頁面
     */
    function queueRenderPage(num) {
        if (pageIsRendering) {
            pageNumIsPending = num;
        } else {
            renderPage(num);
        }
    }
    
    /**
     * 更新頁面控制按鈕
     */
    function updatePageControls() {
        $('#prev-page').prop('disabled', pageNum <= 1);
        $('#next-page').prop('disabled', pageNum >= pdfDoc.numPages);
    }
    
    /**
     * 滾動到簽名表單
     */
    function scrollToSignatureForm() {
        $('html, body').animate({
            scrollTop: $('.signature-form-container').offset().top - 100
        }, 500);
    }
    
    /**
     * 高亮簽名欄位
     */
    function highlightSignatureField(field) {
        $('.signature-field-marker').removeClass('active');
        field.addClass('active');
        
        setTimeout(function() {
            field.removeClass('active');
        }, 3000);
    }
    
    /**
     * 更新提交按鈕狀態
     */
    function updateSubmitButton() {
        const submitButton = $('#submit-signature');
        const name = $('#signer-name').val().trim();
        const email = $('#signer-email').val().trim();
        const agreed = $('#agree-terms').is(':checked');
        const hasSignature = signaturePad && !signaturePad.isEmpty();
        
        const isValid = name && email && isValidEmail(email) && hasSignature && agreed;
        submitButton.prop('disabled', !isValid);
    }
    
    /**
     * 顯示載入狀態
     */
    function showLoading(show) {
        if (show) {
            $('.pdf-viewer-container').addClass('loading');
        } else {
            $('.pdf-viewer-container').removeClass('loading');
        }
    }
    
    /**
     * 顯示錯誤訊息
     */
    function showError(message) {
        showMessage(message, 'error');
    }
    
    /**
     * 顯示成功訊息
     */
    function showSuccess(message) {
        showMessage(message, 'success');
    }
    
    /**
     * 顯示訊息
     */
    function showMessage(message, type) {
        // 移除現有訊息
        $('.error-message, .success-message, .warning-message').remove();
        
        const messageClass = type === 'error' ? 'error-message' : 
                            type === 'success' ? 'success-message' : 'warning-message';
        
        const messageDiv = $('<div>')
            .addClass(messageClass)
            .html(message);
        
        $('.signature-form-container').prepend(messageDiv);
        
        // 滾動到訊息
        $('html, body').animate({
            scrollTop: messageDiv.offset().top - 100
        }, 300);
        
        // 自動隱藏成功訊息
        if (type === 'success') {
            setTimeout(function() {
                messageDiv.fadeOut(500, function() {
                    $(this).remove();
                });
            }, 5000);
        }
    }
    
    /**
     * 輔助函數
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 監聽簽名板變化以更新提交按鈕
    if (typeof SignaturePad !== 'undefined') {
        $(document).on('signature-pad-changed', function() {
            updateSubmitButton();
        });
    }
    
    // 鍵盤快捷鍵
    $(document).on('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.which) {
                case 13: // Ctrl+Enter 提交簽名
                    if (!isSubmitting && $('#submit-signature').is(':visible') && !$('#submit-signature').is(':disabled')) {
                        e.preventDefault();
                        $('#signature-form').submit();
                    }
                    break;
                case 67: // Ctrl+C 清除簽名
                    if (signaturePad && e.target.tagName !== 'INPUT') {
                        e.preventDefault();
                        signaturePad.clear();
                    }
                    break;
            }
        }
        
        // ESC 鍵清除錯誤訊息
        if (e.which === 27) {
            $('.error-message').fadeOut();
        }
    });
    
})(jQuery);