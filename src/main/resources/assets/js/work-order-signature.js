// Work Order Signature Page JavaScript
let workOrderData = null;
let signaturePad = null;

DOM.ready(() => {
    initializePage();
});

async function initializePage() {
    try {
        // Get unique link from URL path
        const pathParts = window.location.pathname.split('/');
        const uniqueLink = pathParts[pathParts.length - 1];
        
        if (!uniqueLink) {
            showErrorState();
            return;
        }
        
        // Load work order data
        await loadWorkOrderData(uniqueLink);
        
        // Initialize signature pad
        initializeSignaturePad();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Page initialization error:', error);
        showErrorState();
    }
}

async function loadWorkOrderData(uniqueLink) {
    try {
        const response = await API.get(`/api/work-order-data/${uniqueLink}`);
        
        if (response.success) {
            workOrderData = response.data;
            displayWorkOrderData();
            hideLoadingState();
        } else {
            throw new Error('Work order not found');
        }
        
    } catch (error) {
        console.error('Error loading work order:', error);
        showErrorState();
    }
}

function displayWorkOrderData() {
    if (!workOrderData) return;
    
    // Display work order number
    const numberElement = document.getElementById('workOrderNumber');
    if (numberElement) {
        numberElement.textContent = workOrderData.work_order_number;
    }
    
    // Display date
    const dateElement = document.getElementById('workOrderDate');
    if (dateElement) {
        dateElement.textContent = DateUtils.formatDate(workOrderData.date);
    }
    
    // Display site name if available
    if (workOrderData.site_name) {
        const siteElement = document.getElementById('siteName');
        const siteContainer = document.getElementById('siteContainer');
        if (siteElement && siteContainer) {
            siteElement.textContent = workOrderData.site_name;
            siteContainer.style.display = 'block';
        }
    }
    
    // Display location if available
    const locationParts = [
        workOrderData.building,
        workOrderData.floor,
        workOrderData.unit
    ].filter(Boolean);
    
    if (locationParts.length > 0) {
        const locationElement = document.getElementById('location');
        const locationContainer = document.getElementById('locationContainer');
        if (locationElement && locationContainer) {
            locationElement.textContent = locationParts.join(' / ');
            locationContainer.style.display = 'block';
        }
    }
    
    // Display reason if available
    if (workOrderData.reason) {
        const reasonElement = document.getElementById('reason');
        const reasonContainer = document.getElementById('reasonContainer');
        if (reasonElement && reasonContainer) {
            reasonElement.textContent = workOrderData.reason;
            reasonContainer.style.display = 'block';
        }
    }
    
    // Display worker name if available
    if (workOrderData.worker_name) {
        const workerElement = document.getElementById('workerName');
        const workerContainer = document.getElementById('workerContainer');
        if (workerElement && workerContainer) {
            workerElement.textContent = workOrderData.worker_name;
            workerContainer.style.display = 'block';
        }
    }
    
    // Display amount if greater than 0
    if (workOrderData.amount > 0) {
        const amountElement = document.getElementById('amount');
        const amountContainer = document.getElementById('amountContainer');
        if (amountElement && amountContainer) {
            amountElement.textContent = `NT$ ${workOrderData.amount.toLocaleString()}`;
            amountContainer.style.display = 'block';
        }
    }
    
    // Display photos if available
    if (workOrderData.photos && workOrderData.photos.length > 0) {
        displayPhotos(workOrderData.photos);
    }
}

function displayPhotos(photos) {
    const photosSection = document.getElementById('photosSection');
    const photosGrid = document.getElementById('photosGrid');
    
    if (photosSection && photosGrid) {
        photosSection.style.display = 'block';
        photosGrid.innerHTML = '';
        
        photos.forEach(photo => {
            const photoItem = DOM.createElement('div', { className: 'photo-item' });
            
            const img = DOM.createElement('img', {
                src: `/uploads/${photo.photo_path}`,
                alt: photo.original_name || 'Work order photo',
                loading: 'lazy'
            });
            
            img.addEventListener('click', () => {
                openPhotoModal(img.src, photo.original_name);
            });
            
            const photoName = DOM.createElement('div', {
                className: 'photo-name',
                textContent: photo.original_name || 'Photo'
            });
            
            photoItem.appendChild(img);
            photoItem.appendChild(photoName);
            photosGrid.appendChild(photoItem);
        });
    }
}

function openPhotoModal(src, name) {
    // Create simple photo modal
    const modal = DOM.createElement('div', {
        className: 'modal show',
        innerHTML: `
            <div class="modal-content" style="max-width: 90%; max-height: 90%;">
                <h3>${name || 'Photo'}</h3>
                <img src="${src}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">關閉</button>
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

function initializeSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    if (canvas) {
        signaturePad = new SignaturePad(canvas, {
            strokeColor: '#000000',
            strokeWidth: 2
        });
        
        // Resize canvas on window resize
        window.addEventListener('resize', () => {
            setTimeout(() => {
                signaturePad.setupCanvas();
            }, 100);
        });
    }
}

function setupEventListeners() {
    // Clear signature button
    const clearBtn = document.getElementById('clearSignature');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (signaturePad) {
                signaturePad.clear();
            }
        });
    }
    
    // Form submission
    const form = document.getElementById('signatureForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Modal close events
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('successModal');
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const signerName = document.getElementById('signerName').value.trim();
    const signerEmail = document.getElementById('signerEmail').value.trim();
    
    // Validation
    if (!signerName) {
        UI.showAlert('請輸入簽名人姓名', 'error');
        return;
    }
    
    if (signerEmail && !Validator.email(signerEmail)) {
        UI.showAlert('請輸入有效的電子郵件地址', 'error');
        return;
    }
    
    if (!signaturePad || signaturePad.isEmpty()) {
        UI.showAlert('請先進行數位簽名', 'error');
        return;
    }
    
    try {
        UI.setFormLoading(form, true);
        
        const signatureData = signaturePad.toDataURL();
        
        const response = await API.post(`/api/work-orders/${workOrderData.id}/signature`, {
            signatureData: signatureData,
            signerName: signerName,
            signerEmail: signerEmail
        });
        
        if (response.success) {
            showSuccessModal(signerEmail);
        } else {
            throw new Error(response.error || '簽名提交失敗');
        }
        
    } catch (error) {
        console.error('Signature submission error:', error);
        UI.showAlert(error.message || '簽名提交失敗，請稍後再試', 'error');
    } finally {
        UI.setFormLoading(form, false);
    }
}

function showSuccessModal(emailSent) {
    const modal = document.getElementById('successModal');
    
    if (emailSent) {
        const emailNotification = document.getElementById('emailNotification');
        if (emailNotification) {
            emailNotification.style.display = 'block';
        }
    }
    
    UI.showModal('successModal');
    
    // Disable form after successful submission
    const form = document.getElementById('signatureForm');
    if (form) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const workOrderContent = document.getElementById('workOrderContent');
    
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    
    if (workOrderContent) {
        workOrderContent.style.display = 'block';
    }
}

function showErrorState() {
    const loadingState = document.getElementById('loadingState');
    const workOrderContent = document.getElementById('workOrderContent');
    const errorState = document.getElementById('errorState');
    
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    
    if (workOrderContent) {
        workOrderContent.style.display = 'none';
    }
    
    if (errorState) {
        errorState.style.display = 'block';
    }
}