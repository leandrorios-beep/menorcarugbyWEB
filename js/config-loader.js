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

            // Parse key=value pairs (handle values containing '=')
            const idx = trimmedLine.indexOf('=');
            if (idx > 0) {
                const key = trimmedLine.substring(0, idx).trim();
                const value = trimmedLine.substring(idx + 1).trim();
                if (key && value) {
                    this.config[key] = value;
                }
            }
        });
    }

    loadDefaultConfig() {
        this.config = {
            // Tienda discontinuada: ver data/external-urls.txt.
            'STORE_ES': '', 'STORE_CA': '', 'STORE_EN': '',
            'STORE_FR': '', 'STORE_IT': '', 'STORE_PT': '',
            'REGISTRATION_SCHOOL': 'https://www.menorcarugbyclub.com/inscripcion',
            'REGISTRATION_YOUTH': 'https://www.menorcarugbyclub.com/inscripcion',
            'REGISTRATION_SENIOR': 'https://www.menorcarugbyclub.com/inscripcion',
            'REGISTRATION_MEMBERS': 'https://www.menorcarugbyclub.com/socios',
            'CHAT_URL': 'https://smartchatweb-pi.vercel.app/',
            'INSTAGRAM_URL': 'https://www.instagram.com/menorcarugby/',
            'FACEBOOK_URL': 'https://www.facebook.com/menorcarugby',
            'TIKTOK_URL': 'https://www.tiktok.com/@menorcarugbyclub',
            'PHONE': '+34 971 XXX XXX',
            'EMAIL': 'hola@menorcarugbyclub.com',
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
        const self = this;

        // Sin direccion de tienda no se engancha nada: el boton se queda
        // deshabilitado diciendo que esta en preparacion, en vez de abrir una
        // pestaña en blanco. El dia que el club tenga tienda propia, se pone la
        // direccion en data/external-urls.txt y esto vuelve a funcionar solo.
        if (!storeURL) {
            document.querySelectorAll('.store-link, .product-btn').forEach(link => {
                link.setAttribute('disabled', 'disabled');
                link.style.opacity = '0.55';
                link.style.cursor = 'not-allowed';
                const texto = link.querySelector('span');
                if (texto) texto.textContent = this.textoTiendaCerrada();
                link.querySelectorAll('i').forEach(ic => ic.remove());
                link.addEventListener('click', (e) => e.preventDefault());
            });
            const navStore = document.querySelector('a[href="#tienda"]');
            if (navStore) navStore.addEventListener('click', (e) => e.preventDefault());
            return;
        }

        // Clone and replace to remove old listeners, then add new ones
        document.querySelectorAll('.store-link, .product-btn').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                self.openExternalStore(storeURL);
            });
        });

        // Update navigation store link
        const navStoreLink = document.querySelector('a[href="#tienda"]');
        if (navStoreLink) {
            const newNav = navStoreLink.cloneNode(true);
            navStoreLink.parentNode.replaceChild(newNav, navStoreLink);
            newNav.addEventListener('click', (e) => {
                e.preventDefault();
                self.openExternalStore(storeURL);
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

        // Don't replace the chat launcher functionality - let main.js handle it
        // This ensures the internal chat widget works properly

        // Contact navigation handled by regular navigation

        // Contact chat button is handled by main.js - no need to override
    }

    setupContactSection() {
        // Don't hide the contact section - keep it visible but make chat button work
        // const contactSection = document.getElementById('contacto');
        // if (contactSection) {
        //     contactSection.style.display = 'none';
        // }

        // Update any contact buttons to open internal chat
        document.querySelectorAll('[data-action="contact"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleInternalChat();
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

    /** El aviso de tienda cerrada, en el idioma que este navegando. */
    textoTiendaCerrada() {
        const t = {
            es: 'Tienda en preparación',
            ca: 'Botiga en preparació',
            en: 'Shop coming soon',
            fr: 'Boutique en préparation',
            it: 'Negozio in preparazione',
            pt: 'Loja em preparação',
        };
        return t[(typeof i18n !== 'undefined' && i18n && i18n.currentLanguage) || 'es'] || t.es;
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
        // Use internal chat widget instead of external window
        this.toggleInternalChat();
    }

    toggleInternalChat() {
        // Find the chat window element
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
            // Show the chat with animation
            chatWindow.classList.add('active');

            // Focus on the chat input if available
            setTimeout(() => {
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 300);
        } else {
            console.warn('Internal chat window not found');
            // If main.js toggleChat function is available, use it
            if (typeof window.toggleChat === 'function') {
                window.toggleChat();
            }
        }
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