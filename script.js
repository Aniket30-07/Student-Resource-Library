// Application State
let resources = [];
let filteredResources = [];

// DOM Elements
const elements = {
    toggleFormBtn: document.getElementById('toggleFormBtn'),
    closeFormBtn: document.getElementById('closeFormBtn'),
    cancelFormBtn: document.getElementById('cancelFormBtn'),
    formContainer: document.getElementById('formContainer'),
    resourceForm: document.getElementById('resourceForm'),
    resourceType: document.getElementById('resourceType'),
    fileUploadGroup: document.getElementById('fileUploadGroup'),
    urlInputGroup: document.getElementById('urlInputGroup'),
    resourceFile: document.getElementById('resourceFile'),
    resourceUrl: document.getElementById('resourceUrl'),
    searchInput: document.getElementById('searchInput'),
    filterType: document.getElementById('filterType'),
    filterSemester: document.getElementById('filterSemester'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    resourcesGrid: document.getElementById('resourcesGrid'),
    emptyState: document.getElementById('emptyState'),
    resourceCount: document.getElementById('resourceCount'),
    toast: document.getElementById('toast')
};

// Initialize Application
function init() {
    loadResourcesFromStorage();
    applyFilters();
    attachEventListeners();
}

// Event Listeners
function attachEventListeners() {
    // Form Toggle
    elements.toggleFormBtn.addEventListener('click', openForm);
    elements.closeFormBtn.addEventListener('click', closeForm);
    elements.cancelFormBtn.addEventListener('click', closeForm);

    // Form Submission
    elements.resourceForm.addEventListener('submit', handleFormSubmit);

    // Resource Type Change
    elements.resourceType.addEventListener('change', handleResourceTypeChange);

    // Search and Filters
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    elements.filterType.addEventListener('change', applyFilters);
    elements.filterSemester.addEventListener('change', applyFilters);
    elements.clearFiltersBtn.addEventListener('click', clearFilters);

    // Event Delegation for Resource Actions
    elements.resourcesGrid.addEventListener('click', handleResourceActions);
}

// Form Management
function openForm() {
    elements.formContainer.classList.add('active');
    elements.resourceForm.reset();
    handleResourceTypeChange();
}

function closeForm() {
    elements.formContainer.classList.remove('active');
    elements.resourceForm.reset();
}

function handleResourceTypeChange() {
    const selectedType = elements.resourceType.value;
    
    if (selectedType === 'article') {
        elements.fileUploadGroup.style.display = 'none';
        elements.urlInputGroup.style.display = 'block';
        elements.resourceFile.removeAttribute('required');
        elements.resourceUrl.setAttribute('required', 'required');
    } else if (selectedType === 'pdf' || selectedType === 'image') {
        elements.fileUploadGroup.style.display = 'block';
        elements.urlInputGroup.style.display = 'none';
        elements.resourceFile.setAttribute('required', 'required');
        elements.resourceUrl.removeAttribute('required');
        
        // Update file input accept attribute
        if (selectedType === 'pdf') {
            elements.resourceFile.accept = '.pdf';
        } else if (selectedType === 'image') {
            elements.resourceFile.accept = 'image/*';
        }
    } else {
        elements.fileUploadGroup.style.display = 'none';
        elements.urlInputGroup.style.display = 'none';
        elements.resourceFile.removeAttribute('required');
        elements.resourceUrl.removeAttribute('required');
    }
}

// Form Submission Handler
function handleFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('resourceTitle').value.trim();
    const subject = document.getElementById('resourceSubject').value.trim();
    const type = elements.resourceType.value;
    const semester = document.getElementById('resourceSemester').value;

    // Validation
    if (!title || !subject || !type || !semester) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Handle file or URL based on type
    if (type === 'article') {
        const url = elements.resourceUrl.value.trim();
        if (!url || !isValidURL(url)) {
            showToast('Please enter a valid URL', 'error');
            return;
        }
        addResource(title, subject, type, semester, url);
    } else {
        const file = elements.resourceFile.files[0];
        if (!file) {
            showToast('Please select a file', 'error');
            return;
        }

        // Validate file type
        if (type === 'pdf' && file.type !== 'application/pdf') {
            showToast('Please select a valid PDF file', 'error');
            return;
        }
        if (type === 'image' && !file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            return;
        }

        // Convert file to base64
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileData = event.target.result;
            addResource(title, subject, type, semester, fileData, file.name);
        };
        reader.onerror = function() {
            showToast('Error reading file', 'error');
        };
        reader.readAsDataURL(file);
    }
}

// Add Resource to State and Storage
function addResource(title, subject, type, semester, content, fileName = null) {
    const resource = {
        id: generateId(),
        title,
        subject,
        type,
        semester,
        content,
        fileName,
        createdAt: new Date().toISOString()
    };

    resources.unshift(resource);
    saveResourcesToStorage();
    applyFilters();
    closeForm();
    showToast('Resource added successfully!', 'success');
}

// Delete Resource
function deleteResource(id) {
    if (!confirm('Are you sure you want to delete this resource?')) {
        return;
    }

    resources = resources.filter(resource => resource.id !== id);
    saveResourcesToStorage();
    applyFilters();
    showToast('Resource deleted successfully', 'success');
}

// Open Resource
function openResource(id) {
    const resource = resources.find(r => r.id === id);
    if (!resource) {
        showToast('Resource not found', 'error');
        return;
    }

    if (resource.type === 'article') {
        window.open(resource.content, '_blank');
    } else {
        // Open PDF or Image in new tab
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            if (resource.type === 'pdf') {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${resource.title}</title>
                        <style>
                            body { margin: 0; padding: 0; }
                            iframe { width: 100vw; height: 100vh; border: none; }
                        </style>
                    </head>
                    <body>
                        <iframe src="${resource.content}"></iframe>
                    </body>
                    </html>
                `);
            } else if (resource.type === 'image') {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${resource.title}</title>
                        <style>
                            body { 
                                margin: 0; 
                                padding: 20px; 
                                background: #1a1a1a; 
                                display: flex; 
                                justify-content: center; 
                                align-items: center;
                                min-height: 100vh;
                            }
                            img { 
                                max-width: 100%; 
                                max-height: 90vh; 
                                object-fit: contain;
                                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${resource.content}" alt="${resource.title}">
                    </body>
                    </html>
                `);
            }
        } else {
            showToast('Please allow pop-ups to open resources', 'error');
        }
    }
}

// Event Delegation for Resource Actions
function handleResourceActions(e) {
    const target = e.target;
    
    if (target.classList.contains('btn-open')) {
        const id = target.closest('.resource-card').dataset.id;
        openResource(id);
    }
    
    if (target.classList.contains('btn-delete')) {
        const id = target.closest('.resource-card').dataset.id;
        deleteResource(id);
    }
}

// Filter and Search Logic
function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    const typeFilter = elements.filterType.value;
    const semesterFilter = elements.filterSemester.value;

    filteredResources = resources.filter(resource => {
        // Search filter
        const matchesSearch = 
            resource.title.toLowerCase().includes(searchTerm) ||
            resource.subject.toLowerCase().includes(searchTerm);

        // Type filter
        const matchesType = !typeFilter || resource.type === typeFilter;

        // Semester filter
        const matchesSemester = !semesterFilter || resource.semester === semesterFilter;

        return matchesSearch && matchesType && matchesSemester;
    });

    renderResources();
    updateResourceCount();
}

function clearFilters() {
    elements.searchInput.value = '';
    elements.filterType.value = '';
    elements.filterSemester.value = '';
    applyFilters();
}

// DOM Rendering
function renderResources() {
    // Clear grid
    elements.resourcesGrid.innerHTML = '';

    if (filteredResources.length === 0) {
        elements.emptyState.classList.add('visible');
        return;
    }

    elements.emptyState.classList.remove('visible');

    // Create and append resource cards
    filteredResources.forEach(resource => {
        const card = createResourceCard(resource);
        elements.resourcesGrid.appendChild(card);
    });
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.dataset.id = resource.id;

    const badgeClass = `badge-${resource.type}`;
    const typeLabel = resource.type.toUpperCase();
    const semesterLabel = `Semester ${resource.semester}`;

    card.innerHTML = `
        <span class="resource-type-badge ${badgeClass}">${typeLabel}</span>
        <h3 class="resource-title">${escapeHtml(resource.title)}</h3>
        <p class="resource-subject">📚 ${escapeHtml(resource.subject)}</p>
        <p class="resource-semester">🎓 ${semesterLabel}</p>
        <div class="resource-actions">
            <button class="btn-open">Open</button>
            <button class="btn-delete">Delete</button>
        </div>
    `;

    return card;
}

function updateResourceCount() {
    const count = filteredResources.length;
    const label = count === 1 ? 'resource' : 'resources';
    elements.resourceCount.textContent = `${count} ${label}`;
}

// LocalStorage Management
function saveResourcesToStorage() {
    try {
        localStorage.setItem('studentResources', JSON.stringify(resources));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showToast('Error saving data. Storage might be full.', 'error');
    }
}

function loadResourcesFromStorage() {
    try {
        const stored = localStorage.getItem('studentResources');
        if (stored) {
            resources = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        resources = [];
    }
}

// Utility Functions
function generateId() {
    return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
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

function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// Initialize on DOM Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
