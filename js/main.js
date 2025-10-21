// ==========================================================================
// MENORCA RUGBY CLUB - JAVASCRIPT
// Advanced functionality with photo upload, gallery, and responsive features
// ==========================================================================

// Simple config object to replace config-loader.js
const siteConfig = {
    'STORE_ES': 'https://menorcarugby.clupik.app/es/shopCategory/all',
    'STORE_CA': 'https://menorcarugby.clupik.app/ca/shopCategory/all',
    'STORE_EN': 'https://menorcarugby.clupik.app/en/shopCategory/all',
    'STORE_FR': 'https://menorcarugby.clupik.app/fr/shopCategory/all',
    'STORE_IT': 'https://menorcarugby.clupik.app/it/shopCategory/all',
    'STORE_PT': 'https://menorcarugby.clupik.app/pt/shopCategory/all',
    'CHAT_URL': 'https://smartchatweb-pi.vercel.app/',
    'INSTAGRAM_URL': 'https://www.instagram.com/menorcarugby/',
    'FACEBOOK_URL': 'https://www.facebook.com/menorcarugby',
    'TIKTOK_URL': 'https://www.tiktok.com/@menorcarugbyclub'
};

document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    initNavigation();

    // Gallery functionality
    initGallery();

    // Load gallery images dynamically
    loadGalleryImages();

    // Photo upload functionality
    initPhotoUpload();

    // Form functionality
    initForms();

    // Smooth scrolling for navigation links
    initSmoothScroll();

    // Intersection Observer for animations
    initScrollAnimations();

    // Parallax effects
    initParallaxEffects();

    // Chat widget functionality
    initChatWidget();

    // Setup external links
    setupExternalLinks();

    // Setup image fallbacks
    setupImageFallbacks();

    // Setup random hero background
    setupRandomHeroBackground();
});

// ==========================================================================
// NAVIGATION
// ==========================================================================

function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Active link highlighting
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section[id]');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });
}

// ==========================================================================
// SMOOTH SCROLLING
// ==========================================================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==========================================================================
// GALLERY
// ==========================================================================

function initGallery() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    let currentImageIndex = 0;
    let visibleImages = [];

    // Filter functionality
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            galleryItems.forEach((item, index) => {
                const category = item.getAttribute('data-category');

                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    item.style.animation = `fadeInUp 0.5s ${index * 0.1}s both`;
                } else {
                    item.style.display = 'none';
                }
            });

            // Update visible images array for lightbox
            updateVisibleImages();
        });
    });

    // Update visible images for lightbox navigation
    function updateVisibleImages() {
        visibleImages = Array.from(galleryItems)
            .filter(item => item.style.display !== 'none')
            .map(item => item.querySelector('img').src);
    }

    // Initial visible images setup
    updateVisibleImages();

    // Lightbox functionality
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const imgSrc = item.querySelector('img').src;
            currentImageIndex = visibleImages.indexOf(imgSrc);
            openLightbox(imgSrc);
        });
    });

    function openLightbox(src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Add keyboard navigation
        document.addEventListener('keydown', handleKeyDown);
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
    }

    function showPrevImage() {
        currentImageIndex = (currentImageIndex - 1 + visibleImages.length) % visibleImages.length;
        lightboxImg.src = visibleImages[currentImageIndex];
    }

    function showNextImage() {
        currentImageIndex = (currentImageIndex + 1) % visibleImages.length;
        lightboxImg.src = visibleImages[currentImageIndex];
    }

    function handleKeyDown(e) {
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                showPrevImage();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
        }
    }

    // Event listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', showPrevImage);
    lightboxNext.addEventListener('click', showNextImage);

    // Close lightbox when clicking outside image
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
}

// ==========================================================================
// PHOTO UPLOAD
// ==========================================================================

function initPhotoUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadBtn = document.getElementById('uploadBtn');

    // Check if uploadArea exists before accessing its methods
    if (!uploadArea) {
        console.log('Upload area not found, skipping photo upload initialization');
        return;
    }

    const uploadLink = uploadArea.querySelector('.upload-link');

    let selectedFiles = [];

    // Click to select files
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadLink.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!uploadArea.contains(e.relatedTarget)) {
            uploadArea.classList.remove('dragover');
        }
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    function handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showNotification('Por favor, selecciona solo archivos de imagen.', 'warning');
            return;
        }

        // Add new files to selected files
        selectedFiles = [...selectedFiles, ...imageFiles];
        displayPreview();
    }

    function displayPreview() {
        uploadPreview.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <button class="preview-remove" onclick="removePreviewImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                uploadPreview.appendChild(previewItem);
            };

            reader.readAsDataURL(file);
        });

        // Show upload button if files are selected
        uploadBtn.style.display = selectedFiles.length > 0 ? 'block' : 'none';
    }

    // Make removePreviewImage globally available
    window.removePreviewImage = function(index) {
        selectedFiles.splice(index, 1);
        displayPreview();
    };

    // Upload functionality
    uploadBtn.addEventListener('click', () => {
        if (selectedFiles.length === 0) {
            showNotification('Por favor, selecciona al menos una imagen.', 'warning');
            return;
        }

        // Simulate upload process
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
        uploadBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            showNotification(`${selectedFiles.length} imagen(es) subida(s) exitosamente!`, 'success');

            // Reset
            selectedFiles = [];
            uploadPreview.innerHTML = '';
            fileInput.value = '';
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Subir Fotos';
            uploadBtn.disabled = false;
            uploadBtn.style.display = 'none';
        }, 2000);
    });
}

// ==========================================================================
// FORMS
// ==========================================================================

function initForms() {
    const joinForm = document.getElementById('joinForm');

    if (joinForm) {
        joinForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get form data
            const formData = new FormData(joinForm);
            const data = Object.fromEntries(formData);

            // Validate form
            if (!validateJoinForm(data)) {
                return;
            }

            // Show loading state
            const submitBtn = joinForm.querySelector('.form-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            // Simulate API call
            setTimeout(() => {
                showNotification('¡Solicitud enviada exitosamente! Te contactaremos pronto.', 'success');

                // Reset form
                joinForm.reset();

                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;

                // Reset floating labels
                const labels = joinForm.querySelectorAll('label');
                labels.forEach(label => {
                    const input = label.previousElementSibling;
                    if (input && input.value === '') {
                        label.style.transform = '';
                        label.style.fontSize = '';
                        label.style.color = '';
                    }
                });
            }, 2000);
        });
    }
}

function validateJoinForm(data) {
    const requiredFields = ['nombre', 'email', 'telefono', 'edad'];
    const errors = [];

    requiredFields.forEach(field => {
        if (!data[field] || data[field].trim() === '') {
            errors.push(`El campo ${field} es obligatorio.`);
        }
    });

    // Email validation
    if (data.email && !isValidEmail(data.email)) {
        errors.push('El email no tiene un formato válido.');
    }

    if (errors.length > 0) {
        showNotification(errors.join(' '), 'error');
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==========================================================================
// SCROLL ANIMATIONS
// ==========================================================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for scroll animations
    const animateElements = document.querySelectorAll('.team-card, .news-card, .value-item, .info-card');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        observer.observe(el);
    });
}

// ==========================================================================
// PARALLAX EFFECTS
// ==========================================================================

function initParallaxEffects() {
    let ticking = false;

    function updateParallax() {
        const scrollY = window.pageYOffset;

        // Hero parallax
        const hero = document.querySelector('.hero');
        if (hero) {
            const heroVideo = hero.querySelector('.hero-video');
            heroVideo.style.transform = `translateY(${scrollY * 0.5}px)`;
        }

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick);
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 500px;
        animation: slideInRight 0.3s ease;
        font-family: var(--font-primary);
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

// Debounce function for performance optimization
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// ==========================================================================
// PERFORMANCE OPTIMIZATIONS
// ==========================================================================

// Lazy loading for images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Optimize scroll events
const optimizedScrollHandler = throttle(() => {
    // Handle scroll events here
}, 16); // ~60fps

window.addEventListener('scroll', optimizedScrollHandler);

// ==========================================================================
// ACCESSIBILITY IMPROVEMENTS
// ==========================================================================


// ==========================================================================
// ERROR HANDLING
// ==========================================================================

window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.error);
    // You can add error reporting here
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise Rejection:', e.reason);
    // You can add error reporting here
});

// ==========================================================================
// ANIMATIONS CSS (added via JavaScript for better organization)
// ==========================================================================

const animationStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .notification-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0.25rem;
        margin-left: 1rem;
        opacity: 0.8;
        transition: opacity 0.2s;
    }

    .notification-close:hover {
        opacity: 1;
    }

    .skip-link:focus {
        top: 6px !important;
    }
`;

// Add animation styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// ==========================================================================
// CHAT WIDGET
// ==========================================================================

function initChatWidget() {
    console.log('🚀 CHAT: Starting initialization');

    // Add a global test function
    window.testChat = function() {
        console.log('🧪 CHAT: Manual test triggered');
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
            chatWindow.style.cssText = `
                position: fixed !important;
                bottom: 80px !important;
                right: 0 !important;
                width: 380px !important;
                height: 500px !important;
                background: white !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
                z-index: 10000 !important;
                display: block !important;
                opacity: 1 !important;
                transform: scale(1) translateY(0) !important;
            `;
            console.log('✅ CHAT: Manual test applied styles');
        } else {
            console.error('❌ CHAT: No chatWindow found in manual test');
        }
    };

    // Wait longer for DOM to be fully ready
    setTimeout(() => {
        console.log('🕐 CHAT: DOM ready, finding elements...');

        const chatLauncher = document.getElementById('chatLauncher');
        const contactChatBtn = document.getElementById('contactChatBtn');
        const chatWindow = document.getElementById('chatWindow');
        const chatClose = document.getElementById('chatClose');

        console.log('🔍 CHAT: Element check:', {
            chatLauncher: chatLauncher ? 'FOUND' : 'NOT FOUND',
            contactChatBtn: contactChatBtn ? 'FOUND' : 'NOT FOUND',
            chatWindow: chatWindow ? 'FOUND' : 'NOT FOUND',
            chatClose: chatClose ? 'FOUND' : 'NOT FOUND'
        });

        if (!chatWindow) {
            console.error('❌ CHAT: No chatWindow element found. Available elements with ID:');
            const allWithIds = document.querySelectorAll('[id]');
            allWithIds.forEach(el => {
                if (el.id.toLowerCase().includes('chat')) {
                    console.log('📝 Found chat-related element:', el.id, el.tagName);
                }
            });
            return;
        }

        function showChat() {
            console.log('💬 CHAT: Opening external chat in iframe');

            // Get external chat URL from config loader
            let chatURL = 'https://smartchatweb-pi.vercel.app/';
            if (typeof configLoader !== 'undefined' && configLoader.getChatURL) {
                chatURL = configLoader.getChatURL();
            }
            console.log('🔗 CHAT: Using URL:', chatURL);

            // Check if mobile device
            const isMobile = window.innerWidth <= 768;
            console.log('📱 CHAT: Mobile device detected:', isMobile);

            // Create iframe if it doesn't exist
            let iframe = chatWindow.querySelector('iframe');
            if (!iframe) {
                // Clear existing content and create mobile-optimized header
                const headerStyle = isMobile ?
                    'background: #182B49; color: white; padding: 12px 16px; border-radius: 0; display: flex; justify-content: space-between; align-items: center; position: fixed; top: 0; left: 0; right: 0; width: 100%; height: 60px; z-index: 10001; box-sizing: border-box;' :
                    'background: #182B49; color: white; padding: 15px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;';

                const closeButtonStyle = isMobile ?
                    'background: rgba(255,255,255,0.1); border: none; color: white; font-size: 18px; cursor: pointer; padding: 8px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;' :
                    'background: rgba(255,255,255,0.1); border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;';

                const iframeStyle = isMobile ?
                    'position: fixed; top: 60px; left: 0; right: 0; bottom: 0; width: 100vw; height: calc(100vh - 60px); border: none; border-radius: 0; z-index: 10000;' :
                    'width: 100%; height: calc(100% - 60px); border: none; border-radius: 0 0 12px 12px;';

                chatWindow.innerHTML = `
                    <div class="chat-header" style="${headerStyle}">
                        <div>
                            <h4 style="margin: 0; font-size: 16px;">Menorca Rugby Chat</h4>
                            <span style="font-size: 12px; opacity: 0.8;">Soporte en tiempo real</span>
                        </div>
                        <button id="chatClose" style="${closeButtonStyle}">&times;</button>
                    </div>
                    <iframe src="${chatURL}"
                            style="${iframeStyle}"
                            onerror="console.error('Error loading chat iframe')">
                    </iframe>
                `;

                // Reconnect close button
                const newCloseBtn = chatWindow.querySelector('#chatClose');
                if (newCloseBtn) {
                    newCloseBtn.onclick = function(e) {
                        console.log('🖱️ CHAT: Close button clicked from iframe');
                        hideChat();
                    };
                }
            }

            // Apply different styles based on device type
            if (isMobile) {
                // Mobile: Full screen
                chatWindow.style.cssText = `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: white !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    z-index: 10000 !important;
                    display: block !important;
                    opacity: 1 !important;
                    transform: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    max-width: none !important;
                    max-height: none !important;
                `;
                console.log('📱 CHAT: Mobile full-screen mode activated');
            } else {
                // Desktop: Window style - increased height and better positioning
                chatWindow.style.cssText = `
                    position: fixed !important;
                    bottom: 20px !important;
                    right: 20px !important;
                    width: 400px !important;
                    height: calc(100vh - 120px) !important;
                    max-height: 700px !important;
                    background: white !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
                    z-index: 10000 !important;
                    display: block !important;
                    opacity: 1 !important;
                    transform: scale(1) translateY(0) !important;
                    transition: all 0.3s ease !important;
                    border: 1px solid rgba(24, 43, 73, 0.2) !important;
                `;
                console.log('🖥️ CHAT: Desktop window mode activated');
            }

            chatWindow.classList.add('active');

            // Prevent body scroll when chat opens (especially important for mobile)
            document.body.classList.add('chat-open');

            console.log('✅ CHAT: External chat loaded in iframe');

        }

        function hideChat() {
            console.log('❌ CHAT: Closing chat window');
            chatWindow.classList.remove('active');

            // Re-enable body scroll when chat closes
            document.body.classList.remove('chat-open');
            chatWindow.style.display = 'none';
            console.log('✅ CHAT: Chat closed');
        }

        // Add event listeners
        if (chatLauncher) {
            console.log('🎯 CHAT: Setting up launcher');
            chatLauncher.onclick = function(e) {
                console.log('🖱️ CHAT: Launcher clicked!');
                e.preventDefault();
                e.stopPropagation();
                showChat();
                return false;
            };
        }

        if (contactChatBtn) {
            console.log('🎯 CHAT: Setting up contact button');
            contactChatBtn.onclick = function(e) {
                console.log('🖱️ CHAT: Contact button clicked!');
                e.preventDefault();
                e.stopPropagation();
                showChat();
                return false;
            };
        }

        if (chatClose) {
            console.log('🎯 CHAT: Setting up close button');
            chatClose.onclick = function(e) {
                console.log('🖱️ CHAT: Close button clicked!');
                e.preventDefault();
                e.stopPropagation();
                hideChat();
                return false;
            };
        }

        console.log('✅ CHAT: Setup completed');
        console.log('🧪 CHAT: Type "window.testChat()" in console to force open chat');

    }, 500);
}

// ==========================================================================
// DYNAMIC GALLERY LOADER
// ==========================================================================

// Updated carousel functionality to replace the existing gallery code

function loadGalleryImages() {
    const carouselTrack = document.getElementById('carousel-track');
    if (!carouselTrack) return;

    // Define all available images with categories
    const galleryImages = [
        // Dynamic gallery images (with original names)
        { src: 'assets/images/gallery/foto (1).jpg', category: 'partidos', alt: 'Partido Rugby' },
        { src: 'assets/images/gallery/foto (6).jpg', category: 'entrenamientos', alt: 'Entrenamiento' },
        { src: 'assets/images/gallery/foto (7).jpg', category: 'eventos', alt: 'Evento Club' },
        { src: 'assets/images/gallery/foto (8).jpg', category: 'partidos', alt: 'Celebración' },
        { src: 'assets/images/gallery/foto (9).jpg', category: 'entrenamientos', alt: 'Técnica Rugby' },
        { src: 'assets/images/gallery/foto (10).jpg', category: 'eventos', alt: 'Familia Rugby' },
        { src: 'assets/images/gallery/foto (11).jpg', category: 'partidos', alt: 'Equipo Unidos' },
        { src: 'assets/images/gallery/foto (12).jpg', category: 'entrenamientos', alt: 'Preparación' },
        { src: 'assets/images/gallery/foto (13).jpg', category: 'eventos', alt: 'Diversión' },
        { src: 'assets/images/gallery/foto (14).jpg', category: 'partidos', alt: 'Competencia' },
        { src: 'assets/images/gallery/foto (15).jpg', category: 'entrenamientos', alt: 'Práctica' },
        { src: 'assets/images/gallery/foto (16).jpg', category: 'eventos', alt: 'Comunidad' },
        { src: 'assets/images/gallery/foto (17).jpg', category: 'partidos', alt: 'Victoria' },
        { src: 'assets/images/gallery/foto (18).jpg', category: 'entrenamientos', alt: 'Formación' },
        { src: 'assets/images/gallery/foto (19).jpg', category: 'eventos', alt: 'Celebración' },
        { src: 'assets/images/gallery/foto (20).jpg', category: 'partidos', alt: 'Pasión Rugby' }
    ];

    // Add static images with fixed names (try both .jpg and .jpeg)
    const staticImageNumbers = [1, 2, 3, 4, 5];
    const staticCategories = ['eventos', 'partidos', 'entrenamientos', 'eventos', 'partidos'];
    const staticAlts = ['Club Rugby', 'Acción Rugby', 'Desarrollo', 'Comunidad Rugby', 'Unión Rugby'];

    const staticImages = [];

    // Create image objects for each static image, checking both extensions
    staticImageNumbers.forEach((num, index) => {
        // Try .jpeg first, then .jpg as fallback
        const jpegPath = `assets/images/static/${num}.jpeg`;
        const jpgPath = `assets/images/static/${num}.jpg`;

        staticImages.push({
            src: jpegPath,
            fallback: jpgPath,
            category: staticCategories[index],
            alt: staticAlts[index],
            isStatic: true
        });
    });

    // Combine all images
    const allImages = [...galleryImages, ...staticImages];

    // Shuffle array randomly
    const shuffledImages = shuffleArray([...allImages]);

    // Clear loading indicator
    carouselTrack.innerHTML = '';

    console.log(`Loading ${allImages.length} images total`);
    console.log('Static images:', staticImages.map(img => img.src));

    // Create gallery items
    shuffledImages.forEach((image, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.setAttribute('data-category', image.category);

        const onErrorHandler = image.isStatic && image.fallback
            ? `this.onerror=null; this.src='${image.fallback}'; console.log('Trying fallback:', this.src);`
            : `console.log('Failed to load:', this.src); this.parentElement.remove();`;

        galleryItem.innerHTML = `
            <img src="${image.src}" alt="${image.alt}" loading="lazy" onerror="${onErrorHandler}">
            <div class="gallery-overlay">
                <i class="fas fa-search-plus"></i>
            </div>
        `;

        carouselTrack.appendChild(galleryItem);
    });

    // Duplicate images for seamless infinite scroll
    const duplicateImages = [...shuffledImages];
    duplicateImages.forEach((image, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.setAttribute('data-category', image.category);

        const onErrorHandler = image.isStatic && image.fallback
            ? `this.onerror=null; this.src='${image.fallback}'; console.log('Trying fallback:', this.src);`
            : `console.log('Failed to load:', this.src); this.parentElement.remove();`;

        galleryItem.innerHTML = `
            <img src="${image.src}" alt="${image.alt}" loading="lazy" onerror="${onErrorHandler}">
            <div class="gallery-overlay">
                <i class="fas fa-search-plus"></i>
            </div>
        `;

        carouselTrack.appendChild(galleryItem);
    });

    // Set CSS custom property for animation
    const totalItems = shuffledImages.length;
    document.documentElement.style.setProperty('--total-items', totalItems);

    // Initialize carousel functionality
    setTimeout(() => {
        initCarouselEvents();
    }, 500);
}

function initCarouselEvents() {
    const galleryItems = document.querySelectorAll('.gallery-item');

    // Remove old filter functionality - no longer needed

    // Lightbox functionality only
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            if (img && img.src) {
                openLightbox(img.src, img.alt);
            }
        });
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==========================================================================
// EXTERNAL LINKS SETUP
// ==========================================================================

function setupExternalLinks() {
    // Setup store links
    document.querySelectorAll('.store-link, .product-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const currentLang = i18n?.currentLanguage || 'es';
            const storeKey = `STORE_${currentLang.toUpperCase()}`;
            const storeURL = siteConfig[storeKey] || siteConfig['STORE_ES'];
            window.open(storeURL, '_blank', 'noopener,noreferrer');
        });
    });

    // Setup navigation store link
    const navStoreLink = document.querySelector('a[href="#tienda"]');
    if (navStoreLink) {
        navStoreLink.addEventListener('click', (e) => {
            e.preventDefault();
            const currentLang = i18n?.currentLanguage || 'es';
            const storeKey = `STORE_${currentLang.toUpperCase()}`;
            const storeURL = siteConfig[storeKey] || siteConfig['STORE_ES'];
            window.open(storeURL, '_blank', 'noopener,noreferrer');
        });
    }

    // Setup social media links
    document.querySelectorAll('.social-link, .footer-social a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('instagram')) {
            link.href = siteConfig.INSTAGRAM_URL;
        } else if (href && href.includes('facebook')) {
            link.href = siteConfig.FACEBOOK_URL;
        } else if (href && href.includes('tiktok')) {
            link.href = siteConfig.TIKTOK_URL;
        }
    });
}

// ==========================================================================
// IMAGE HELPER FUNCTIONS
// ==========================================================================

function setupImageFallbacks() {
    // Update team photos with flexible extensions
    const teamImages = [
        { selector: 'img[alt="Senior"]', fileName: 'senior' },
        { selector: 'img[alt="Juvenil"]', fileName: 'juveniles' },
        { selector: 'img[alt="Escuela"]', fileName: 'escuela' }
    ];

    teamImages.forEach(team => {
        const imgElement = document.querySelector(team.selector);
        if (imgElement) {
            setImageWithFallback(imgElement, 'assets/images/static', team.fileName);
        }
    });

    // Update hero background with fallback
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        const img = new Image();
        img.onload = function() {
            heroSection.style.backgroundImage = `url('${this.src}')`;
        };
        img.onerror = function() {
            const fallbackImg = new Image();
            fallbackImg.onload = function() {
                heroSection.style.backgroundImage = `url('${this.src}')`;
            };
            fallbackImg.src = 'assets/images/static/1.jpg';
        };
        img.src = 'assets/images/static/1.jpeg';
    }
}

function setImageWithFallback(imgElement, basePath, fileName) {
    const jpegPath = `${basePath}/${fileName}.jpeg`;
    const jpgPath = `${basePath}/${fileName}.jpg`;

    imgElement.src = jpegPath;
    imgElement.onerror = function() {
        this.onerror = null;
        this.src = jpgPath;
    };
}

// ==========================================================================
// RANDOM HERO BACKGROUND
// ==========================================================================

function setupRandomHeroBackground() {
    // Array of available hero images
    const heroImages = [1, 2, 3, 4, 5];

    // Select random image
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    const selectedImage = heroImages[randomIndex];

    console.log(`🎲 Selected random hero image: ${selectedImage}.jpeg`);

    // Find hero video element
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        const jpegPath = `assets/images/static/${selectedImage}.jpeg`;
        const jpgPath = `assets/images/static/${selectedImage}.jpg`;

        // Try JPEG first, fallback to JPG
        const img = new Image();
        img.onload = function() {
            heroVideo.style.backgroundImage = `url('${this.src}')`;
            console.log(`✅ Hero background loaded: ${this.src}`);
        };
        img.onerror = function() {
            console.log(`❌ Failed to load ${jpegPath}, trying JPG fallback`);
            const fallbackImg = new Image();
            fallbackImg.onload = function() {
                heroVideo.style.backgroundImage = `url('${this.src}')`;
                console.log(`✅ Hero background loaded (fallback): ${this.src}`);
            };
            fallbackImg.onerror = function() {
                console.log(`❌ Failed to load both JPEG and JPG for image ${selectedImage}`);
            };
            fallbackImg.src = jpgPath;
        };
        img.src = jpegPath;
    } else {
        console.error('❌ Hero video element not found');
    }
}
