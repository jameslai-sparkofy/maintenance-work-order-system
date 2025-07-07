// New Work Order Form JavaScript
DOM.ready(() => {
    initializeForm();
    loadFormData();
    setupEventListeners();
});

let selectedFiles = [];

function initializeForm() {
    // Set today's date as default
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = DateUtils.toISODateString();
    }
    
    // Store original button text
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.dataset.originalText = submitBtn.textContent;
    }
}

async function loadFormData() {
    try {
        // Load recent sites
        await loadRecentSites();
        
        // Load workers list
        await loadWorkers();
        
    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

async function loadRecentSites() {
    try {
        const response = await API.get('/api/work-orders/sites/recent');
        const sitesDatalist = document.getElementById('recentSites');
        
        if (response.success && sitesDatalist) {
            sitesDatalist.innerHTML = '';
            response.data.forEach(site => {
                const option = document.createElement('option');
                option.value = site;
                sitesDatalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading recent sites:', error);
    }
}

async function loadWorkers() {
    try {
        const response = await API.get('/api/work-orders/workers/all');
        const workersDatalist = document.getElementById('workersList');
        
        if (response.success && workersDatalist) {
            workersDatalist.innerHTML = '';
            response.data.forEach(worker => {
                const option = document.createElement('option');
                option.value = worker.name;
                option.dataset.id = worker.id;
                workersDatalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

function setupEventListeners() {
    const form = document.getElementById('workOrderForm');
    const fileInput = document.getElementById('photos');
    const fileUploadArea = document.getElementById('fileUploadArea');
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // File upload events
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (fileUploadArea) {
        // Drag and drop events
        fileUploadArea.addEventListener('dragover', handleDragOver);
        fileUploadArea.addEventListener('dragleave', handleDragLeave);
        fileUploadArea.addEventListener('drop', handleFileDrop);
        
        // Click to upload
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('successModal');
        if (e.target === modal) {
            UI.hideModal('successModal');
        }
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Add selected files to form data
    selectedFiles.forEach((file, index) => {
        formData.append('photos', file);
    });
    
    try {
        UI.setFormLoading(form, true);
        
        const response = await API.postFormData('/api/work-orders', formData);
        
        if (response.success) {
            showSuccessModal(response.data, response.shareUrl);
            form.reset();
            selectedFiles = [];
            updatePhotoPreview();
            
            // Reset date to today
            const dateInput = document.getElementById('date');
            if (dateInput) {
                dateInput.value = DateUtils.toISODateString();
            }
        } else {
            throw new Error(response.error || '建立維修單失敗');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        UI.showAlert(error.message || '建立維修單失敗，請稍後再試', 'error');
    } finally {
        UI.setFormLoading(form, false);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function addFiles(files) {
    const maxFiles = 10;
    
    if (selectedFiles.length + files.length > maxFiles) {
        UI.showAlert(`最多只能上傳 ${maxFiles} 張照片`, 'warning');
        return;
    }
    
    files.forEach(file => {
        try {
            FileUtils.validateImage(file);
            selectedFiles.push(file);
        } catch (error) {
            UI.showAlert(`檔案 "${file.name}": ${error.message}`, 'error');
        }
    });
    
    updatePhotoPreview();
}

async function updatePhotoPreview() {
    const previewContainer = document.getElementById('photoPreview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
            const previewUrl = await FileUtils.createImagePreview(file);
            const photoItem = createPhotoPreviewItem(file, previewUrl, i);
            previewContainer.appendChild(photoItem);
        } catch (error) {
            console.error('Error creating preview:', error);
        }
    }
}

function createPhotoPreviewItem(file, previewUrl, index) {
    const photoItem = DOM.createElement('div', { className: 'photo-item' });
    
    const img = DOM.createElement('img', {
        src: previewUrl,
        alt: file.name
    });
    
    const removeBtn = DOM.createElement('button', {
        className: 'photo-remove',
        innerHTML: '×',
        type: 'button'
    });
    
    removeBtn.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        updatePhotoPreview();
    });
    
    const photoInfo = DOM.createElement('div', {
        className: 'photo-info',
        innerHTML: `
            <div>${file.name}</div>
            <div>${FileUtils.formatFileSize(file.size)}</div>
        `
    });
    
    photoItem.appendChild(img);
    photoItem.appendChild(removeBtn);
    photoItem.appendChild(photoInfo);
    
    return photoItem;
}

function showSuccessModal(workOrder, shareUrl) {
    const modal = document.getElementById('successModal');
    const detailsContainer = document.getElementById('successDetails');
    
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="success-message">
                <h4>✅ 維修單建立成功！</h4>
                <p>維修單號：<span class="work-order-number">${workOrder.work_order_number}</span></p>
                <p>專屬分享連結：</p>
                <div class="share-url">
                    <a href="${shareUrl}" target="_blank">${window.location.origin}${shareUrl}</a>
                </div>
                <p><small>此連結可分享給客戶或工地主任進行確認簽名</small></p>
            </div>
        `;
    }
    
    UI.showModal('successModal');
}

function resetForm() {
    const form = document.getElementById('workOrderForm');
    if (form) {
        form.reset();
        selectedFiles = [];
        updatePhotoPreview();
        
        // Reset date to today
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = DateUtils.toISODateString();
        }
        
        UI.showAlert('表單已重置', 'info');
    }
}

// Global functions for HTML onclick handlers
window.resetForm = resetForm;