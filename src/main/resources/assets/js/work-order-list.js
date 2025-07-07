// Work Order List Management JavaScript
let workOrders = [];
let filteredWorkOrders = [];
let currentFilters = {};

DOM.ready(() => {
    initializePage();
});

async function initializePage() {
    setupEventListeners();
    await loadWorkOrders();
    setupFilters();
}

function setupEventListeners() {
    // Filters form
    const filtersForm = document.getElementById('filtersForm');
    if (filtersForm) {
        filtersForm.addEventListener('submit', handleFiltersSubmit);
    }
    
    // Reset filters button
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Refresh list button
    const refreshBtn = document.getElementById('refreshList');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadWorkOrders();
        });
    }
    
    // Export data button
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // Modal close events
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('detailModal');
        if (e.target === modal) {
            UI.hideModal('detailModal');
        }
    });
}

async function loadWorkOrders() {
    try {
        showTableLoading();
        
        const params = new URLSearchParams(currentFilters);
        const response = await API.get(`/api/work-orders?${params.toString()}`);
        
        if (response.success) {
            workOrders = response.data;
            filteredWorkOrders = [...workOrders];
            
            displayWorkOrders();
            updateStatistics();
            hideTableLoading();
        } else {
            throw new Error(response.error || '載入工單失敗');
        }
        
    } catch (error) {
        console.error('Error loading work orders:', error);
        UI.showAlert(error.message || '載入工單失敗，請稍後再試', 'error');
        showEmptyState();
    }
}

function displayWorkOrders() {
    const tbody = document.getElementById('workOrdersBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredWorkOrders.length === 0) {
        showEmptyState();
        return;
    }
    
    // Show table and hide empty state
    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    filteredWorkOrders.forEach(workOrder => {
        const row = createWorkOrderRow(workOrder);
        tbody.appendChild(row);
    });
}

function createWorkOrderRow(workOrder) {
    const row = document.createElement('tr');
    
    // Format location
    const location = [workOrder.building, workOrder.floor, workOrder.unit]
        .filter(Boolean)
        .join(' / ') || '-';
    
    // Format amount
    const amount = workOrder.amount > 0 ? 
        `NT$ ${workOrder.amount.toLocaleString()}` : '-';
    
    // Status badge
    const statusClass = workOrder.status === 'confirmed' ? 'status-confirmed' : 'status-pending';
    const statusText = workOrder.status === 'confirmed' ? '已確認' : '待確認';
    const statusIcon = workOrder.status === 'confirmed' ? '✅' : '⏳';
    
    row.innerHTML = `
        <td>
            <span class="work-order-number">${workOrder.work_order_number}</span>
        </td>
        <td>${DateUtils.formatDate(workOrder.date)}</td>
        <td>${workOrder.site_name || '-'}</td>
        <td>
            <span class="location" title="${location}">${location}</span>
        </td>
        <td>${workOrder.worker_name || '-'}</td>
        <td class="amount">${amount}</td>
        <td>
            <span class="status-badge ${statusClass}">
                ${statusIcon} ${statusText}
            </span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="action-btn btn-view" onclick="window.viewWorkOrder(${workOrder.id})" title="查看詳情">
                    👁️ 查看
                </button>
                <button class="action-btn btn-share" onclick="window.shareWorkOrder('${workOrder.unique_link}')" title="分享連結">
                    🔗 分享
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function updateStatistics() {
    const totalCount = filteredWorkOrders.length;
    const pendingCount = filteredWorkOrders.filter(wo => wo.status === 'pending').length;
    const confirmedCount = filteredWorkOrders.filter(wo => wo.status === 'confirmed').length;
    const totalAmount = filteredWorkOrders.reduce((sum, wo) => sum + (wo.amount || 0), 0);
    
    // Update DOM elements
    const totalElement = document.getElementById('totalCount');
    const pendingElement = document.getElementById('pendingCount');
    const confirmedElement = document.getElementById('confirmedCount');
    const amountElement = document.getElementById('totalAmount');
    
    if (totalElement) totalElement.textContent = totalCount.toLocaleString();
    if (pendingElement) pendingElement.textContent = pendingCount.toLocaleString();
    if (confirmedElement) confirmedElement.textContent = confirmedCount.toLocaleString();
    if (amountElement) {
        amountElement.textContent = totalAmount > 0 ? 
            `NT$ ${totalAmount.toLocaleString()}` : 'NT$ 0';
    }
}

function setupFilters() {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const dateFromInput = document.getElementById('filterDateFrom');
    const dateToInput = document.getElementById('filterDateTo');
    
    if (dateFromInput) {
        dateFromInput.value = DateUtils.toISODateString(thirtyDaysAgo);
    }
    if (dateToInput) {
        dateToInput.value = DateUtils.toISODateString(today);
    }
}

function handleFiltersSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    currentFilters = {};
    
    for (const [key, value] of formData.entries()) {
        if (value.trim()) {
            currentFilters[key] = value.trim();
        }
    }
    
    loadWorkOrders();
}

function resetFilters() {
    const filtersForm = document.getElementById('filtersForm');
    if (filtersForm) {
        filtersForm.reset();
        currentFilters = {};
        setupFilters();
        loadWorkOrders();
    }
}

async function viewWorkOrder(workOrderId) {
    try {
        const response = await API.get(`/api/work-orders/${workOrderId}`);
        
        if (response.success) {
            showWorkOrderModal(response.data);
        } else {
            throw new Error(response.error || '載入工單詳情失敗');
        }
        
    } catch (error) {
        console.error('Error loading work order details:', error);
        UI.showAlert(error.message || '載入工單詳情失敗', 'error');
    }
}

function showWorkOrderModal(workOrder) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (modalTitle) {
        modalTitle.textContent = `工單詳情 - ${workOrder.work_order_number}`;
    }
    
    if (modalBody) {
        modalBody.innerHTML = generateWorkOrderHTML(workOrder);
    }
    
    UI.showModal('detailModal');
}

function generateWorkOrderHTML(workOrder) {
    const location = [workOrder.building, workOrder.floor, workOrder.unit]
        .filter(Boolean)
        .join(' / ') || '未指定';
    
    const amount = workOrder.amount > 0 ? 
        `NT$ ${workOrder.amount.toLocaleString()}` : '未指定';
    
    const statusClass = workOrder.status === 'confirmed' ? 'status-confirmed' : 'status-pending';
    const statusText = workOrder.status === 'confirmed' ? '✅ 已確認' : '⏳ 待確認';
    
    let html = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>工單號</label>
                <div class="value">
                    <span class="work-order-number">${workOrder.work_order_number}</span>
                </div>
            </div>
            
            <div class="detail-item">
                <label>日期</label>
                <div class="value">${DateUtils.formatDate(workOrder.date)}</div>
            </div>
            
            <div class="detail-item">
                <label>案場</label>
                <div class="value">${workOrder.site_name || '未指定'}</div>
            </div>
            
            <div class="detail-item">
                <label>位置</label>
                <div class="value">${location}</div>
            </div>
            
            <div class="detail-item">
                <label>工務人員</label>
                <div class="value">${workOrder.worker_name || '未指定'}</div>
            </div>
            
            <div class="detail-item">
                <label>金額</label>
                <div class="value">${amount}</div>
            </div>
            
            <div class="detail-item">
                <label>狀態</label>
                <div class="value">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            
            <div class="detail-item">
                <label>建立時間</label>
                <div class="value">${DateUtils.formatDateTime(workOrder.created_at)}</div>
            </div>
        </div>
    `;
    
    // Add reason if exists
    if (workOrder.reason) {
        html += `
            <div class="detail-item" style="grid-column: 1 / -1;">
                <label>維修原因</label>
                <div class="value">${workOrder.reason}</div>
            </div>
        `;
    }
    
    // Add photos section if exists
    if (workOrder.photos && workOrder.photos.length > 0) {
        html += `
            <div class="photos-section">
                <h4>📷 相關照片</h4>
                <div class="photos-grid">
        `;
        
        workOrder.photos.forEach(photo => {
            html += `
                <img src="/uploads/${photo.photo_path}" 
                     alt="${photo.original_name || 'Photo'}"
                     class="photo-thumbnail"
                     onclick="window.openPhotoModal('/uploads/${photo.photo_path}', '${photo.original_name || 'Photo'}')">
            `;
        });
        
        html += `</div></div>`;
    }
    
    // Add signature section if exists
    if (workOrder.signature) {
        html += `
            <div class="signature-section">
                <h4>✍️ 確認簽名</h4>
                <div class="signature-display">
                    <img src="${workOrder.signature.signature_data}" 
                         alt="Digital Signature" 
                         class="signature-image">
                    <div class="signature-info">
                        <p><strong>簽名人:</strong> ${workOrder.signature.signer_name || '未提供'}</p>
                        <p><strong>簽名時間:</strong> ${DateUtils.formatDateTime(workOrder.signature.signed_at)}</p>
                        ${workOrder.signature.signer_email ? 
                            `<p><strong>電子郵件:</strong> ${workOrder.signature.signer_email}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add share link
    html += `
        <div class="detail-item" style="grid-column: 1 / -1; margin-top: 1rem;">
            <label>分享連結</label>
            <div class="value">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <code style="flex: 1; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.875rem;">
                        ${window.location.origin}/work-order/${workOrder.unique_link}
                    </code>
                    <button class="btn btn-primary btn-sm" onclick="window.shareWorkOrder('${workOrder.unique_link}')">
                        🔗 複製連結
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

function shareWorkOrder(uniqueLink) {
    const shareUrl = `${window.location.origin}/work-order/${uniqueLink}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            UI.showAlert('分享連結已複製到剪貼簿', 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showShareModal(shareUrl);
        });
    } else {
        showShareModal(shareUrl);
    }
}

function showShareModal(shareUrl) {
    const modal = DOM.createElement('div', {
        className: 'modal show',
        innerHTML: `
            <div class="modal-content">
                <h3>分享工單連結</h3>
                <p>請複製以下連結分享給客戶或工地主任：</p>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 1rem 0; word-break: break-all; font-family: monospace;">
                    ${shareUrl}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">關閉</button>
                </div>
            </div>
        `
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

function openPhotoModal(src, name) {
    const modal = DOM.createElement('div', {
        className: 'modal show',
        innerHTML: `
            <div class="modal-content" style="max-width: 90%; max-height: 90%;">
                <div class="modal-header">
                    <h3>${name || 'Photo'}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div style="text-align: center; padding: 1rem;">
                    <img src="${src}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">
                </div>
            </div>
        `
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

function exportData() {
    if (filteredWorkOrders.length === 0) {
        UI.showAlert('沒有資料可以匯出', 'warning');
        return;
    }
    
    try {
        const csvContent = generateCSV(filteredWorkOrders);
        downloadCSV(csvContent, 'work-orders.csv');
        UI.showAlert('資料匯出成功', 'success');
    } catch (error) {
        console.error('Export error:', error);
        UI.showAlert('匯出失敗，請稍後再試', 'error');
    }
}

function generateCSV(data) {
    const headers = [
        '工單號', '日期', '案場', '棟別', '樓層', '戶別', 
        '維修原因', '工務人員', '金額', '狀態', '建立時間'
    ];
    
    const rows = data.map(workOrder => [
        workOrder.work_order_number,
        workOrder.date,
        workOrder.site_name || '',
        workOrder.building || '',
        workOrder.floor || '',
        workOrder.unit || '',
        workOrder.reason || '',
        workOrder.worker_name || '',
        workOrder.amount || 0,
        workOrder.status === 'confirmed' ? '已確認' : '待確認',
        DateUtils.formatDateTime(workOrder.created_at)
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    return '\uFEFF' + csvContent; // Add BOM for UTF-8
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function showTableLoading() {
    const loadingState = document.getElementById('loadingTable');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
}

function hideTableLoading() {
    const loadingState = document.getElementById('loadingTable');
    if (loadingState) loadingState.style.display = 'none';
}

function showEmptyState() {
    const loadingState = document.getElementById('loadingTable');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

// Global functions for HTML onclick handlers
window.viewWorkOrder = viewWorkOrder;
window.shareWorkOrder = shareWorkOrder;
window.openPhotoModal = openPhotoModal;