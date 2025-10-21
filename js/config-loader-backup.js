// ==========================================================================
// CONFIGURATION LOADER
// Loads external URLs and configuration from external files
// ==========================================================================

class ConfigLoader {
    constructor() {
        this.config = {};
        this.isLoaded = false;
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.setupExternalLinks();
    }

    async loadConfig() {
        try {
            const response = await fetch('data/external-urls.txt');
            const text = await response.text();

            this.parseConfig(text);
            this.isLoaded = true;

            // Dispatch event to notify other components
            document.dispatchEvent(new CustomEvent('configLoaded', {
                detail: { config: this.config }
            }));

        } catch (error) {
            console.warn('Could not load external config, using defaults:', error);
            this.loadDefaultConfig();
        }
    }

    parseConfig(text) {
        const lines = text.split('\n');

        lines.forEach(line => {
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (trimmedLine.startsWith('#') || !trimmedLine) return;

            // Parse key=value pairs
            const [key, value] = trimmedLine.split('=');
            if (key && value) {
                this.config[key.trim()] = value.trim();
            }
        });
    }

    loadDefaultConfig() {
        this.config = {
            'STORE_ES': 'https://menorcarugby.clupik.app/es/shopCategory/all',
            'STORE_CA': 'https://menorcarugby.clupik.app/ca/shopCategory/all',
            'STORE_EN': 'https://menorcarugby.clupik.app/en/shopCategory/all',
            'STORE_FR': 'https://menorcarugby.clupik.app/fr/shopCategory/all',
            'STORE_IT': 'https://menorcarugby.clupik.app/it/shopCategory/all',
            'STORE_PT': 'https://menorcarugby.clupik.app/pt/shopCategory/all',
            'REGISTRATION_SCHOOL': 'https://menorcarugby.clupik.app/es/registrations/21930',
            'REGISTRATION_YOUTH': 'https://menorcarugby.clupik.app/es/registrations/21930',
            'REGISTRATION_SENIOR': 'https://menorcarugby.clupik.app/es/registrations/21868',
            'REGISTRATION_MEMBERS': 'https://menorcarugby.clupik.app/es/registrations/21860',
            'CHAT_URL': 'https://smartchatweb-pi.vercel.app/',
            'INSTAGRAM_URL': 'https://www.instagram.com/menorcarugby/',
            'FACEBOOK_URL': 'https://www.facebook.com/menorcarugby',
            'TIKTOK_URL': 'https://www.tiktok.com/@menorcarugbyclub',
            'PHONE': '+34 971 XXX XXX',
            'EMAIL': 'info@menorcarugby.com',
            'WHATSAPP': '+34 XXX XXX XXX'
        };
        this.isLoaded = true;
    }

    getStoreURL(language = 'es') {
        const key = `STORE_${language.toUpperCase()}`;
        return this.config[key] || this.config['STORE_ES'];
    }

    getChatURL() {
        return this.config['CHAT_URL'] || 'https://smartchatweb-pi.vercel.app/';
    }

    getContactInfo() {
        return {
            phone: this.config['PHONE'],
            email: this.config['EMAIL'],
            whatsapp: this.config['WHATSAPP']
        };
    }

    getSocialMedia() {
        return {
            instagram: this.config['INSTAGRAM_URL'],
            facebook: this.config['FACEBOOK_URL'],
            tiktok: this.config['TIKTOK_URL']
        };
    }

    getRegistrationURLs() {
        return {
            school: this.config['REGISTRATION_SCHOOL'],
            youth: this.config['REGISTRATION_YOUTH'],
            senior: this.config['REGISTRATION_SENIOR'],
            members: this.config['REGISTRATION_MEMBERS']
        };
    }

    getRegistrationURL(category) {
        const key = `REGISTRATION_${category.toUpperCase()}`;
        return this.config[key] || this.config['REGISTRATION_SENIOR'];
    }

    setupExternalLinks() {
        // Update store links
        this.updateStoreLinks();

        // Update social media links
        this.updateSocialLinks();

        // Setup chat integration
        this.setupChatIntegration();

        // Setup contact section
        this.setupContactSection();

        // Setup registration buttons
        this.setupRegistrationButtons();
    }

    updateStoreLinks() {
        const currentLang = i18n?.currentLanguage || 'es';
        const storeURL = this.getStoreURL(currentLang);

        // Update all store links
        document.querySelectorAll('.store-link, .product-btn').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.openExternalStore(storeURL);
            });
        });

        // Update navigation store link
        const navStoreLink = document.querySelector('a[href="#tienda"]');
        if (navStoreLink) {
            navStoreLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openExternalStore(storeURL);
            });
        }
    }

    updateSocialLinks() {
        const socialMedia = this.getSocialMedia();

        document.querySelectorAll('.social-link, .footer-social a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('instagram')) {
                link.href = socialMedia.instagram;
            } else if (href && href.includes('facebook')) {
                link.href = socialMedia.facebook;
            } else if (href && href.includes('tiktok')) {
                link.href = socialMedia.tiktok;
            }
        });
    }

    setupChatIntegration() {
        const chatURL = this.getChatURL();

        // Replace chat launcher functionality
        const chatLauncher = document.getElementById('chatLauncher');
        if (chatLauncher) {
            // Remove existing event listeners by cloning the element
            const newLauncher = chatLauncher.cloneNode(true);
            chatLauncher.parentNode.replaceChild(newLauncher, chatLauncher);

            newLauncher.addEventListener('click', () => {
                this.openExternalChat(chatURL);
            });
        }

        // Update contact navigation to open chat
        const contactLink = document.querySelector('a[href="#contacto"]');
        if (contactLink) {
            contactLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openExternalChat(chatURL);
            });
        }
    }

    setupContactSection() {
        // Hide the contact section since we're using chat
        const contactSection = document.getElementById('contacto');
        if (contactSection) {
            contactSection.style.display = 'none';
        }

        // Update any contact buttons to open chat
        document.querySelectorAll('[data-action="contact"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openExternalChat(this.getChatURL());
            });
        });
    }

    setupRegistrationButtons() {
        document.querySelectorAll('.registration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const category = btn.getAttribute('data-category');
                this.openExternalRegistration(category);
            });
        });
    }

    openExternalRegistration(category) {
        const url = this.getRegistrationURL(category);

        // Add loading indicator
        this.showLoadingMessage('Abriendo registro...');

        // Open in new tab/window
        window.open(url, '_blank', 'noopener,noreferrer');

        // Hide loading after a short delay
        setTimeout(() => this.hideLoadingMessage(), 1000);
    }

    openExternalStore(url) {
        // Add loading indicator
        this.showLoadingMessage('Cargando tienda...');

        // Open in new tab/window
        window.open(url, '_blank', 'noopener,noreferrer');

        // Hide loading after a short delay
        setTimeout(() => this.hideLoadingMessage(), 1000);
    }

    openExternalChat(url) {
        // Add loading indicator
        this.showLoadingMessage('Abriendo chat...');

        // Open in new tab/window optimized for chat
        const chatWindow = window.open(url, 'smartchat',
            'width=400,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no');

        // Focus the chat window
        if (chatWindow) {
            chatWindow.focus();
        }

        // Hide loading after a short delay
        setTimeout(() => this.hideLoadingMessage(), 1000);
    }

    showLoadingMessage(message) {
        // Remove existing loading message
        this.hideLoadingMessage();

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'external-loading';
        loadingDiv.className = 'external-loading';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(loadingDiv);

        // Animate in
        setTimeout(() => loadingDiv.classList.add('active'), 10);
    }

    hideLoadingMessage() {
        const loading = document.getElementById('external-loading');
        if (loading) {
            loading.classList.remove('active');
            setTimeout(() => loading.remove(), 300);
        }
    }

    // Update config when language changes
    onLanguageChange(newLanguage) {
        this.updateStoreLinks();
    }
}

// Initialize config loader
let configLoader;
document.addEventListener('DOMContentLoaded', () => {
    configLoader = new ConfigLoader();
});

// Update when language changes
document.addEventListener('languageChanged', (e) => {
    if (configLoader) {
        configLoader.onLanguageChange(e.detail.language);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigLoader;
}