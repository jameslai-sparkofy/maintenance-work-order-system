// Worker Management JavaScript
let workers = [];
let filteredWorkers = [];

DOM.ready(() => {
    initializePage();
});

async function initializePage() {
    setupEventListeners();
    await loadWorkers();
}

function setupEventListeners() {
    // Toggle form button
    const toggleFormBtn = document.getElementById('toggleForm');
    if (toggleFormBtn) {
        toggleFormBtn.addEventListener('click', toggleWorkerForm);
    }
    
    // Worker form submission
    const workerForm = document.getElementById('workerForm');
    if (workerForm) {
        workerForm.addEventListener('submit', handleWorkerSubmit);
    }
    
    // Edit worker form submission
    const editWorkerForm = document.getElementById('editWorkerForm');
    if (editWorkerForm) {
        editWorkerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateWorker();
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Clear search button
    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    // Refresh list button
    const refreshBtn = document.getElementById('refreshList');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadWorkers();
        });
    }
    
    // Modal close events
    window.addEventListener('click', (e) => {
        const editModal = document.getElementById('editWorkerModal');
        const deleteModal = document.getElementById('deleteWorkerModal');
        
        if (e.target === editModal) {
            UI.hideModal('editWorkerModal');
        }
        if (e.target === deleteModal) {
            UI.hideModal('deleteWorkerModal');
        }
    });
}

async function loadWorkers() {
    try {
        showLoadingState();
        
        const response = await API.get('/api/work-orders/workers/all');
        
        if (response.success) {
            workers = response.data;
            filteredWorkers = [...workers];
            
            displayWorkers();
            updateWorkerCount();
            hideLoadingState();
        } else {
            throw new Error(response.error || '載入工務人員失敗');
        }
        
    } catch (error) {
        console.error('Error loading workers:', error);
        UI.showAlert(error.message || '載入工務人員失敗，請稍後再試', 'error');
        showEmptyState();
    }
}

function displayWorkers() {
    const workersList = document.getElementById('workersList');
    const workersContainer = document.getElementById('workersContainer');
    const emptyState = document.getElementById('emptyWorkers');
    
    if (!workersList) return;
    
    workersList.innerHTML = '';
    
    if (filteredWorkers.length === 0) {
        if (workers.length === 0) {
            showEmptyState();
        } else {
            // Show no search results message
            workersContainer.style.display = 'block';
            emptyState.style.display = 'none';
            
            workersList.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6c757d;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
                    <h3>沒有找到符合條件的工務人員</h3>
                    <p>請嘗試其他搜尋關鍵字</p>
                </div>
            `;
        }
        return;
    }
    
    // Show workers container and hide empty state
    workersContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    filteredWorkers.forEach(worker => {
        const workerCard = createWorkerCard(worker);
        workersList.appendChild(workerCard);
    });
    
    // Add event listeners for worker action buttons
    attachWorkerActionListeners();
}

function createWorkerCard(worker) {
    const card = DOM.createElement('div', { className: 'worker-card' });
    
    // Highlight search terms
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const highlightText = (text) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    };
    
    card.innerHTML = `
        <div class="worker-info">
            <div class="worker-name">${highlightText(worker.name)}</div>
            <div class="worker-contact">
                ${worker.phone ? `
                    <div class="contact-item">
                        <span class="icon">📞</span>
                        <span class="value">${highlightText(worker.phone)}</span>
                    </div>
                ` : ''}
                ${worker.email ? `
                    <div class="contact-item">
                        <span class="icon">📧</span>
                        <span class="value">${highlightText(worker.email)}</span>
                    </div>
                ` : ''}
                ${!worker.phone && !worker.email ? `
                    <div class="contact-item">
                        <span class="icon">ℹ️</span>
                        <span class="value" style="color: #adb5bd;">無聯絡資訊</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="worker-actions">
            <button class="worker-action-btn btn-edit-worker" data-id="${worker.id}">
                ✏️ 編輯
            </button>
            <button class="worker-action-btn btn-delete-worker" data-id="${worker.id}" data-name="${worker.name}">
                🗑️ 刪除
            </button>
        </div>
    `;
    
    return card;
}

function updateWorkerCount() {
    const countElement = document.getElementById('workerCount');
    if (countElement) {
        const total = workers.length;
        const filtered = filteredWorkers.length;
        
        if (total === filtered) {
            countElement.textContent = `${total} 位人員`;
        } else {
            countElement.textContent = `${filtered} / ${total} 位人員`;
        }
    }
}

function toggleWorkerForm() {
    const formContainer = document.getElementById('formContainer');
    const toggleBtn = document.getElementById('toggleForm');
    
    if (formContainer && toggleBtn) {
        if (formContainer.style.display === 'none') {
            showWorkerForm();
        } else {
            hideWorkerForm();
        }
    }
}

function showWorkerForm() {
    const formContainer = document.getElementById('formContainer');
    const toggleBtn = document.getElementById('toggleForm');
    
    if (formContainer && toggleBtn) {
        formContainer.style.display = 'block';
        toggleBtn.textContent = '❌ 隱藏表單';
        
        // Focus on name field
        const nameInput = document.getElementById('workerName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }
}

function hideWorkerForm() {
    const formContainer = document.getElementById('formContainer');
    const toggleBtn = document.getElementById('toggleForm');
    const form = document.getElementById('workerForm');
    
    if (formContainer && toggleBtn) {
        formContainer.style.display = 'none';
        toggleBtn.textContent = '📝 顯示表單';
        
        // Reset form
        if (form) {
            form.reset();
            clearFormValidation(form);
        }
    }
}

async function handleWorkerSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const workerData = {
        name: formData.get('name').trim(),
        phone: formData.get('phone').trim(),
        email: formData.get('email').trim()
    };
    
    // Validation
    if (!workerData.name) {
        showFieldError('workerName', '請輸入工務人員姓名');
        return;
    }
    
    if (workerData.phone && !Validator.phone(workerData.phone)) {
        showFieldError('workerPhone', '請輸入有效的電話號碼');
        return;
    }
    
    if (workerData.email && !Validator.email(workerData.email)) {
        showFieldError('workerEmail', '請輸入有效的電子郵件地址');
        return;
    }
    
    try {
        UI.setFormLoading(form, true);
        
        const response = await API.post('/api/work-orders/workers', workerData);
        
        if (response.success) {
            UI.showAlert('工務人員新增成功', 'success');
            hideWorkerForm();
            await loadWorkers();
        } else {
            throw new Error(response.error || '新增工務人員失敗');
        }
        
    } catch (error) {
        console.error('Error creating worker:', error);
        UI.showAlert(error.message || '新增工務人員失敗，請稍後再試', 'error');
    } finally {
        UI.setFormLoading(form, false);
    }
}

function editWorker(workerId) {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) {
        UI.showAlert('找不到工務人員資料', 'error');
        return;
    }
    
    // Populate edit form
    document.getElementById('editWorkerId').value = worker.id;
    document.getElementById('editWorkerName').value = worker.name;
    document.getElementById('editWorkerPhone').value = worker.phone || '';
    document.getElementById('editWorkerEmail').value = worker.email || '';
    
    // Clear validation
    const editForm = document.getElementById('editWorkerForm');
    if (editForm) {
        clearFormValidation(editForm);
    }
    
    UI.showModal('editWorkerModal');
}

async function updateWorker() {
    const form = document.getElementById('editWorkerForm');
    const formData = new FormData(form);
    
    const workerId = formData.get('id');
    const workerData = {
        name: formData.get('name').trim(),
        phone: formData.get('phone').trim(),
        email: formData.get('email').trim()
    };
    
    // Validation
    if (!workerData.name) {
        showFieldError('editWorkerName', '請輸入工務人員姓名');
        return;
    }
    
    if (workerData.phone && !Validator.phone(workerData.phone)) {
        showFieldError('editWorkerPhone', '請輸入有效的電話號碼');
        return;
    }
    
    if (workerData.email && !Validator.email(workerData.email)) {
        showFieldError('editWorkerEmail', '請輸入有效的電子郵件地址');
        return;
    }
    
    try {
        UI.setFormLoading(form, true);
        
        const response = await API.request(`/api/work-orders/workers/${workerId}`, {
            method: 'PUT',
            body: JSON.stringify(workerData)
        });
        
        if (response.success) {
            UI.showAlert('工務人員資料更新成功', 'success');
            UI.hideModal('editWorkerModal');
            await loadWorkers();
        } else {
            throw new Error(response.error || '更新工務人員失敗');
        }
        
    } catch (error) {
        console.error('Error updating worker:', error);
        UI.showAlert(error.message || '更新工務人員失敗，請稍後再試', 'error');
    } finally {
        UI.setFormLoading(form, false);
    }
}

function deleteWorker(workerId, workerName) {
    document.getElementById('deleteWorkerId').value = workerId;
    document.getElementById('deleteWorkerName').textContent = workerName;
    UI.showModal('deleteWorkerModal');
}

async function confirmDeleteWorker() {
    const workerId = document.getElementById('deleteWorkerId').value;
    
    try {
        const response = await API.request(`/api/work-orders/workers/${workerId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            UI.showAlert('工務人員刪除成功', 'success');
            UI.hideModal('deleteWorkerModal');
            await loadWorkers();
        } else {
            throw new Error(response.error || '刪除工務人員失敗');
        }
        
    } catch (error) {
        console.error('Error deleting worker:', error);
        UI.showAlert(error.message || '刪除工務人員失敗，請稍後再試', 'error');
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredWorkers = [...workers];
    } else {
        filteredWorkers = workers.filter(worker => 
            worker.name.toLowerCase().includes(searchTerm) ||
            (worker.phone && worker.phone.toLowerCase().includes(searchTerm)) ||
            (worker.email && worker.email.toLowerCase().includes(searchTerm))
        );
    }
    
    displayWorkers();
    updateWorkerCount();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        handleSearch({ target: { value: '' } });
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.classList.add('is-invalid');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = DOM.createElement('div', {
        className: 'invalid-feedback',
        textContent: message
    });
    
    field.parentNode.appendChild(errorDiv);
    
    // Focus on field
    field.focus();
    
    // Clear error on input
    const clearError = () => {
        field.classList.remove('is-invalid');
        const errorMsg = field.parentNode.querySelector('.invalid-feedback');
        if (errorMsg) {
            errorMsg.remove();
        }
        field.removeEventListener('input', clearError);
    };
    
    field.addEventListener('input', clearError);
}

function clearFormValidation(form) {
    const invalidFields = form.querySelectorAll('.is-invalid');
    const errorMessages = form.querySelectorAll('.invalid-feedback');
    
    invalidFields.forEach(field => field.classList.remove('is-invalid'));
    errorMessages.forEach(msg => msg.remove());
}

function showLoadingState() {
    const loadingState = document.getElementById('loadingWorkers');
    const workersContainer = document.getElementById('workersContainer');
    const emptyState = document.getElementById('emptyWorkers');
    
    if (loadingState) loadingState.style.display = 'block';
    if (workersContainer) workersContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingWorkers');
    if (loadingState) loadingState.style.display = 'none';
}

function showEmptyState() {
    const loadingState = document.getElementById('loadingWorkers');
    const workersContainer = document.getElementById('workersContainer');
    const emptyState = document.getElementById('emptyWorkers');
    
    if (loadingState) loadingState.style.display = 'none';
    if (workersContainer) workersContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

function cancelWorkerForm() {
    hideWorkerForm();
}

// Attach event listeners to worker action buttons
function attachWorkerActionListeners() {
    // Edit buttons
    document.querySelectorAll('.btn-edit-worker').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('button').dataset.id);
            editWorker(id);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete-worker').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('button').dataset.id);
            const name = e.target.closest('button').dataset.name;
            deleteWorker(id, name);
        });
    });
}

// Global functions for HTML onclick handlers (backup)
window.showWorkerForm = showWorkerForm;
window.editWorker = editWorker;
window.deleteWorker = deleteWorker;
window.updateWorker = updateWorker;
window.confirmDeleteWorker = confirmDeleteWorker;
window.cancelWorkerForm = cancelWorkerForm;