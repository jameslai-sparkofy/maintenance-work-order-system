/**
 * 管理員JavaScript功能
 */

jQuery(document).ready(function($) {
    'use strict';
    
    // 全域變數
    let currentDocument = null;
    let pdfDoc = null;
    let pageNum = 1;
    let pageIsRendering = false;
    let pageNumIsPending = null;
    let scale = 1.2;
    let canvas = null;
    let ctx = null;
    let signatureFields = [];
    let selectedField = null;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    
    // 初始化
    init();
    
    function init() {
        setupEventListeners();
        setupPdfUpload();
        setupFieldManagement();
        setupCopyLink();
    }
    
    /**
     * 設定事件監聽器
     */
    function setupEventListeners() {
        // PDF上傳表單
        $('#pdf-upload-form').on('submit', handlePdfUpload);
        
        // PDF編輯器工具欄
        $('#add-signature-field').on('click', () => addField('signature'));
        $('#add-text-field').on('click', () => addField('text'));
        $('#add-date-field').on('click', () => addField('date'));
        $('#save-fields').on('click', saveAllFields);
        $('#preview-document').on('click', previewDocument);
        
        // 複製分享連結
        $('#copy-share-link').on('click', copyShareLink);
        
        // 查看簽名模態框
        $('.view-signature').on('click', handleViewSignature);
    }
    
    /**
     * 設定PDF上傳功能
     */
    function setupPdfUpload() {
        const form = $('#pdf-upload-form');
        const progressBar = $('#upload-progress');
        const resultDiv = $('#upload-result');
        const pdfEditor = $('#pdf-editor');
        
        form.on('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = $('#pdf_file')[0];
            const file = fileInput.files[0];
            
            if (!file) {
                showError('請選擇PDF文件');
                return;
            }
            
            if (!validatePdfFile(file)) {
                return;
            }
            
            // 準備上傳數據
            formData.append('action', 'upload_pdf');
            formData.append('nonce', wpPdfSignature.uploadNonce);
            formData.append('pdf_file', file);
            formData.append('document_title', $('#document_title').val());
            formData.append('document_description', $('#document_description').val());
            
            // 顯示進度條
            progressBar.show();
            updateProgress(0);
            
            // 上傳文件
            $.ajax({
                url: wpPdfSignature.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                xhr: function() {
                    const xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', function(e) {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            updateProgress(percentComplete);
                        }
                    });
                    return xhr;
                },
                success: function(response) {
                    progressBar.hide();
                    
                    if (response.success) {
                        currentDocument = response.data;
                        showSuccess(response.data.message);
                        
                        // 顯示PDF編輯器
                        loadPdfEditor(response.data);
                        pdfEditor.show();
                        
                        // 清空表單
                        form[0].reset();
                    } else {
                        showError(response.data);
                    }
                },
                error: function() {
                    progressBar.hide();
                    showError('上傳失敗，請重試');
                }
            });
        });
    }
    
    /**
     * 驗證PDF文件
     */
    function validatePdfFile(file) {
        // 檢查文件類型
        if (file.type !== 'application/pdf') {
            showError(wpPdfSignature.strings.invalidFile);
            return false;
        }
        
        // 檢查文件大小（MB）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showError(wpPdfSignature.strings.fileTooLarge);
            return false;
        }
        
        return true;
    }
    
    /**
     * 載入PDF編輯器
     */
    function loadPdfEditor(documentData) {
        canvas = document.getElementById('pdf-canvas');
        ctx = canvas.getContext('2d');
        
        // 載入PDF文件
        const pdfUrl = wpPdfSignature.ajaxUrl + '?action=get_pdf_content&document_id=' + 
                      documentData.document_id + '&nonce=' + wpPdfSignature.nonce;
        
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
            pdfDoc = pdf;
            renderPage(pageNum);
            setupCanvasInteraction();
            loadExistingFields(documentData.document_id);
        }).catch(function(error) {
            console.error('PDF載入失敗:', error);
            showError('PDF載入失敗');
        });
    }
    
    /**
     * 渲染PDF頁面
     */
    function renderPage(num) {
        pageIsRendering = true;
        
        pdfDoc.getPage(num).then(function(page) {
            const viewport = page.getViewport({ scale: scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            const renderTask = page.render(renderContext);
            
            renderTask.promise.then(function() {
                pageIsRendering = false;
                
                if (pageNumIsPending !== null) {
                    renderPage(pageNumIsPending);
                    pageNumIsPending = null;
                }
                
                // 重新繪製簽名欄位
                redrawSignatureFields();
            });
        });
    }
    
    /**
     * 設定畫布互動
     */
    function setupCanvasInteraction() {
        const overlay = $('#signature-fields-overlay');
        
        overlay.on('mousedown', function(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 檢查是否點擊到現有欄位
            const clickedField = getFieldAtPosition(x, y);
            
            if (clickedField) {
                selectField(clickedField);
                isDragging = true;
                dragStart = { x: x - clickedField.position.x, y: y - clickedField.position.y };
            } else {
                // 取消選擇
                selectField(null);
            }
        });
        
        overlay.on('mousemove', function(e) {
            if (isDragging && selectedField) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left - dragStart.x;
                const y = e.clientY - rect.top - dragStart.y;
                
                selectedField.position.x = Math.max(0, Math.min(x, canvas.width - selectedField.size.width));
                selectedField.position.y = Math.max(0, Math.min(y, canvas.height - selectedField.size.height));
                
                redrawSignatureFields();
                updateFieldProperties();
            }
        });
        
        overlay.on('mouseup', function() {
            isDragging = false;
        });
    }
    
    /**
     * 添加簽名欄位
     */
    function addField(type) {
        const fieldId = 'field_' + Date.now();
        const field = {
            id: fieldId,
            type: type,
            name: type + '_' + (signatureFields.length + 1),
            position: { x: 50, y: 50 },
            size: { width: 200, height: 60 },
            required: true,
            order: signatureFields.length
        };
        
        signatureFields.push(field);
        redrawSignatureFields();
        selectField(field);
        
        showSuccess('已添加' + getFieldTypeLabel(type) + '欄位');
    }
    
    /**
     * 重新繪製簽名欄位
     */
    function redrawSignatureFields() {
        const overlay = $('#signature-fields-overlay');
        overlay.empty();
        
        signatureFields.forEach(function(field) {
            const fieldDiv = $('<div>')
                .addClass('signature-field')
                .attr('data-field-id', field.id)
                .css({
                    left: field.position.x + 'px',
                    top: field.position.y + 'px',
                    width: field.size.width + 'px',
                    height: field.size.height + 'px'
                });
            
            if (selectedField && selectedField.id === field.id) {
                fieldDiv.addClass('selected');
            }
            
            const label = $('<div>')
                .addClass('signature-field-label')
                .text(field.name);
                
            fieldDiv.append(label);
            overlay.append(fieldDiv);
        });
    }
    
    /**
     * 選擇欄位
     */
    function selectField(field) {
        selectedField = field;
        redrawSignatureFields();
        updateFieldPropertiesPanel();
    }
    
    /**
     * 更新欄位屬性面板
     */
    function updateFieldPropertiesPanel() {
        const panel = $('#field-properties-content');
        
        if (!selectedField) {
            panel.html('<p>請選擇一個欄位來編輯屬性</p>');
            return;
        }
        
        const html = `
            <table class="form-table">
                <tr>
                    <th>欄位名稱</th>
                    <td><input type="text" id="field-name" value="${selectedField.name}" class="regular-text"></td>
                </tr>
                <tr>
                    <th>欄位類型</th>
                    <td>
                        <select id="field-type">
                            <option value="signature" ${selectedField.type === 'signature' ? 'selected' : ''}>簽名</option>
                            <option value="text" ${selectedField.type === 'text' ? 'selected' : ''}>文字</option>
                            <option value="date" ${selectedField.type === 'date' ? 'selected' : ''}>日期</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>X座標</th>
                    <td><input type="number" id="field-x" value="${selectedField.position.x}" class="small-text"></td>
                </tr>
                <tr>
                    <th>Y座標</th>
                    <td><input type="number" id="field-y" value="${selectedField.position.y}" class="small-text"></td>
                </tr>
                <tr>
                    <th>寬度</th>
                    <td><input type="number" id="field-width" value="${selectedField.size.width}" class="small-text"></td>
                </tr>
                <tr>
                    <th>高度</th>
                    <td><input type="number" id="field-height" value="${selectedField.size.height}" class="small-text"></td>
                </tr>
                <tr>
                    <th>必填</th>
                    <td><input type="checkbox" id="field-required" ${selectedField.required ? 'checked' : ''}></td>
                </tr>
                <tr>
                    <th>排序</th>
                    <td><input type="number" id="field-order" value="${selectedField.order}" class="small-text"></td>
                </tr>
            </table>
            <p>
                <button type="button" class="button" id="update-field">更新欄位</button>
                <button type="button" class="button" id="delete-field">刪除欄位</button>
            </p>
        `;
        
        panel.html(html);
        
        // 綁定事件
        $('#update-field').on('click', updateFieldProperties);
        $('#delete-field').on('click', deleteField);
        
        // 即時更新 - 使用現代事件監聽
        $('#field-name, #field-type, #field-x, #field-y, #field-width, #field-height, #field-required, #field-order')
            .off('input change')
            .on('input change', updateFieldProperties);
    }
    
    /**
     * 更新欄位屬性
     */
    function updateFieldProperties() {
        if (!selectedField) return;
        
        selectedField.name = $('#field-name').val();
        selectedField.type = $('#field-type').val();
        selectedField.position.x = parseInt($('#field-x').val()) || 0;
        selectedField.position.y = parseInt($('#field-y').val()) || 0;
        selectedField.size.width = parseInt($('#field-width').val()) || 100;
        selectedField.size.height = parseInt($('#field-height').val()) || 30;
        selectedField.required = $('#field-required').is(':checked');
        selectedField.order = parseInt($('#field-order').val()) || 0;
        
        redrawSignatureFields();
    }
    
    /**
     * 刪除欄位
     */
    function deleteField() {
        if (!selectedField) return;
        
        if (confirm(wpPdfSignature.strings.deleteConfirm)) {
            const index = signatureFields.findIndex(f => f.id === selectedField.id);
            if (index > -1) {
                signatureFields.splice(index, 1);
                selectedField = null;
                redrawSignatureFields();
                updateFieldPropertiesPanel();
                showSuccess('欄位已刪除');
            }
        }
    }
    
    /**
     * 保存所有欄位
     */
    function saveAllFields() {
        if (!currentDocument) {
            showError('請先上傳PDF文件');
            return;
        }
        
        if (signatureFields.length === 0) {
            showError('請至少添加一個簽名欄位');
            return;
        }
        
        const promises = signatureFields.map(function(field) {
            return $.ajax({
                url: wpPdfSignature.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'save_signature_field',
                    nonce: wpPdfSignature.fieldNonce,
                    document_id: currentDocument.document_id,
                    field_type: field.type,
                    field_name: field.name,
                    field_position: JSON.stringify(field.position),
                    field_size: JSON.stringify(field.size),
                    field_required: field.required ? 1 : 0,
                    field_order: field.order
                }
            });
        });
        
        Promise.all(promises)
            .then(function(responses) {
                const success = responses.every(r => r.success);
                if (success) {
                    showSuccess('所有欄位已保存');
                    
                    // 更新文件狀態為可簽名
                    updateDocumentStatus('ready');
                } else {
                    showError('部分欄位保存失敗');
                }
            })
            .catch(function() {
                showError('保存欄位失敗');
            });
    }
    
    /**
     * 載入現有欄位
     */
    function loadExistingFields(documentId) {
        $.get(wpPdfSignature.ajaxUrl, {
            action: 'get_signature_fields',
            document_id: documentId
        }, function(response) {
            if (response.success && response.data.length > 0) {
                signatureFields = response.data.map(function(field) {
                    return {
                        id: field.id,
                        type: field.field_type,
                        name: field.field_name,
                        position: field.field_position,
                        size: field.field_size,
                        required: field.field_required == 1,
                        order: field.field_order
                    };
                });
                
                redrawSignatureFields();
            }
        });
    }
    
    /**
     * 預覽文件
     */
    function previewDocument() {
        if (!currentDocument) {
            showError('請先上傳PDF文件');
            return;
        }
        
        const uniqueId = currentDocument.unique_id;
        const previewUrl = window.location.origin + '/pdf-signature/' + uniqueId;
        window.open(previewUrl, '_blank');
    }
    
    /**
     * 設定複製連結功能
     */
    function setupCopyLink() {
        $('#copy-share-link').on('click', function() {
            const linkInput = $(this).prev('input');
            const link = linkInput.val();
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(link).then(function() {
                    showCopySuccess();
                });
            } else {
                // 後備方案
                linkInput.select();
                document.execCommand('copy');
                showCopySuccess();
            }
        });
    }
    
    /**
     * 顯示複製成功
     */
    function showCopySuccess() {
        const button = $('#copy-share-link');
        button.addClass('copied');
        setTimeout(function() {
            button.removeClass('copied');
        }, 2000);
    }
    
    /**
     * 查看簽名
     */
    function handleViewSignature(e) {
        e.preventDefault();
        const signatureId = $(this).data('id');
        
        // 這裡可以實現查看簽名的模態框
        alert('查看簽名功能 - ID: ' + signatureId);
    }
    
    /**
     * 輔助函數
     */
    function getFieldAtPosition(x, y) {
        return signatureFields.find(function(field) {
            return x >= field.position.x && x <= field.position.x + field.size.width &&
                   y >= field.position.y && y <= field.position.y + field.size.height;
        });
    }
    
    function getFieldTypeLabel(type) {
        const labels = {
            'signature': '簽名',
            'text': '文字',
            'date': '日期'
        };
        return labels[type] || type;
    }
    
    function updateProgress(percent) {
        $('.progress-fill').css('width', percent + '%');
    }
    
    function updateDocumentStatus(status) {
        if (!currentDocument) return;
        
        $.post(wpPdfSignature.ajaxUrl, {
            action: 'update_document_status',
            nonce: wpPdfSignature.nonce,
            document_id: currentDocument.document_id,
            status: status
        });
    }
    
    function showError(message) {
        showMessage(message, 'error');
    }
    
    function showSuccess(message) {
        showMessage(message, 'success');
    }
    
    function showMessage(message, type) {
        const messageClass = type === 'error' ? 'notice-error' : 'notice-success';
        const messageHtml = `<div class="notice ${messageClass} is-dismissible"><p>${message}</p></div>`;
        
        $('.wrap').prepend(messageHtml);
        
        // 自動消失
        setTimeout(function() {
            $('.notice').fadeOut();
        }, 5000);
    }
    
    // 欄位管理相關函數
    function setupFieldManagement() {
        // 這裡可以添加更多欄位管理功能
    }
    
    // 複製連結相關函數
    function copyShareLink() {
        // 這個函數在setupCopyLink中已經實現
    }
});