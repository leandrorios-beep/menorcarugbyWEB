// ==========================================================================
// INTERNATIONALIZATION SYSTEM
// Automatic language detection and translation management
// ==========================================================================

class I18nSystem {
    constructor() {
        this.currentLanguage = 'es'; // Default to Spanish
        this.fallbackLanguage = 'es';
        this.translations = {};
        this.supportedLanguages = ['es', 'ca', 'en', 'fr', 'it', 'pt'];

        this.init();
    }

    async init() {
        // Detect user language
        this.detectLanguage();

        // Load translations
        await this.loadTranslations();

        // Apply translations
        this.translatePage();

        // Setup language switcher
        this.setupLanguageSwitcher();
    }

    detectLanguage() {
        // Get browser language
        const browserLang = navigator.language || navigator.userLanguage;
        const primaryLang = browserLang.split('-')[0].toLowerCase();

        // Check if we support this language
        if (this.supportedLanguages.includes(primaryLang)) {
            this.currentLanguage = primaryLang;
        }

        // Check localStorage for saved preference
        const savedLang = localStorage.getItem('menorca_rugby_lang');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
        }

        console.log(`🌍 Language detected: ${this.currentLanguage}`);
    }

    async loadTranslations() {
        try {
            const response = await fetch(`lang/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations = await response.json();
            } else {
                // Fallback to Spanish if current language fails
                const fallbackResponse = await fetch(`lang/${this.fallbackLanguage}.json`);
                this.translations = await fallbackResponse.json();
            }
        } catch (error) {
            console.error('Error loading translations:', error);
            // Use fallback translations inline if files fail
            this.translations = this.getFallbackTranslations();
        }
    }

    translatePage() {
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);

            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = translation;
                } else if (element.placeholder !== undefined) {
                    element.placeholder = translation;
                } else {
                    element.innerHTML = translation;
                }
            }
        });

        // Translate elements with data-i18n-attr for attributes
        document.querySelectorAll('[data-i18n-attr]').forEach(element => {
            const attrData = element.getAttribute('data-i18n-attr').split(':');
            const attr = attrData[0];
            const key = attrData[1];
            const translation = this.getTranslation(key);

            if (translation) {
                element.setAttribute(attr, translation);
            }
        });

        // Update document title and meta
        const titleTranslation = this.getTranslation('meta.title');
        if (titleTranslation && typeof titleTranslation === 'string') {
            document.title = titleTranslation;
        }
        const metaDescription = document.querySelector('meta[name="description"]');
        const descTranslation = this.getTranslation('meta.description');
        if (metaDescription && descTranslation && typeof descTranslation === 'string') {
            metaDescription.content = descTranslation;
        }
    }

    getTranslation(key) {
        const keys = key.split('.');
        let translation = this.translations;

        for (const k of keys) {
            if (translation && translation[k] !== undefined) {
                translation = translation[k];
            } else {
                return null;
            }
        }

        // Only return strings, not objects
        return (typeof translation === 'string') ? translation : null;
    }

    changeLanguage(language) {
        if (!this.supportedLanguages.includes(language)) {
            console.warn(`Language ${language} not supported`);
            return;
        }

        this.currentLanguage = language;
        localStorage.setItem('menorca_rugby_lang', language);

        this.loadTranslations().then(() => {
            this.translatePage();
            this.updateLanguageSwitcher();

            // Trigger custom event for other components
            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: this.currentLanguage }
            }));
        });
    }

    setupLanguageSwitcher() {
        // Create language switcher if it doesn't exist
        if (!document.getElementById('language-switcher')) {
            this.createLanguageSwitcher();
        }

        // Add event listeners
        document.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = e.currentTarget.getAttribute('data-lang');
                this.changeLanguage(lang);
            });
        });
    }

    createLanguageSwitcher() {
        const languages = {
            'es': { name: 'Español', flag: '<img src="https://flagcdn.com/w40/es.png" alt="ES" width="20" height="14">' },
            'ca': { name: 'Català', flag: '<img src="assets/images/static/flag-ca.svg" alt="CA" width="20" height="14">' },
            'en': { name: 'English', flag: '<img src="https://flagcdn.com/w40/gb.png" alt="EN" width="20" height="14">' },
            'fr': { name: 'Français', flag: '<img src="https://flagcdn.com/w40/fr.png" alt="FR" width="20" height="14">' },
            'it': { name: 'Italiano', flag: '<img src="https://flagcdn.com/w40/it.png" alt="IT" width="20" height="14">' },
            'pt': { name: 'Português', flag: '<img src="https://flagcdn.com/w40/pt.png" alt="PT" width="20" height="14">' }
        };

        const switcher = document.createElement('div');
        switcher.id = 'language-switcher';
        switcher.className = 'language-switcher';

        switcher.innerHTML = `
            <button class="lang-current" id="lang-current">
                <span class="lang-flag">${languages[this.currentLanguage].flag}</span>
                <span class="lang-name">${languages[this.currentLanguage].name}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="lang-dropdown" id="lang-dropdown">
                ${this.supportedLanguages.map(lang => `
                    <a href="#" class="lang-option ${lang === this.currentLanguage ? 'active' : ''}" data-lang="${lang}">
                        <span class="lang-flag">${languages[lang].flag}</span>
                        <span class="lang-name">${languages[lang].name}</span>
                    </a>
                `).join('')}
            </div>
        `;

        // Add to navigation
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.appendChild(switcher);
        }

        // Toggle dropdown
        const currentBtn = switcher.querySelector('#lang-current');
        const dropdown = switcher.querySelector('#lang-dropdown');

        currentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!switcher.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    updateLanguageSwitcher() {
        const languages = {
            'es': { name: 'Español', flag: '<img src="https://flagcdn.com/w40/es.png" alt="ES" width="20" height="14">' },
            'ca': { name: 'Català', flag: '<img src="assets/images/static/flag-ca.svg" alt="CA" width="20" height="14">' },
            'en': { name: 'English', flag: '<img src="https://flagcdn.com/w40/gb.png" alt="EN" width="20" height="14">' },
            'fr': { name: 'Français', flag: '<img src="https://flagcdn.com/w40/fr.png" alt="FR" width="20" height="14">' },
            'it': { name: 'Italiano', flag: '<img src="https://flagcdn.com/w40/it.png" alt="IT" width="20" height="14">' },
            'pt': { name: 'Português', flag: '<img src="https://flagcdn.com/w40/pt.png" alt="PT" width="20" height="14">' }
        };

        const currentBtn = document.getElementById('lang-current');
        if (currentBtn) {
            currentBtn.innerHTML = `
                <span class="lang-flag">${languages[this.currentLanguage].flag}</span>
                <span class="lang-name">${languages[this.currentLanguage].name}</span>
                <i class="fas fa-chevron-down"></i>
            `;
        }

        // Update active state
        document.querySelectorAll('.lang-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-lang') === this.currentLanguage) {
                option.classList.add('active');
            }
        });
    }

    getFallbackTranslations() {
        return {
            meta: {
                title: "Menorca Rugby Club - Vive la Pasión del Rugby",
                description: "Descubre el Menorca Rugby Club. Únete a nuestra comunidad y vive la pasión del rugby en Menorca con valores de respeto, trabajo en equipo y disciplina."
            },
            nav: {
                home: "Inicio",
                about: "Nosotros",
                team: "Equipo",
                gallery: "Galería",
                news: "Noticias",
                store: "Tienda",
                contact: "Contacto",
                join: "Únete"
            },
            hero: {
                title_main: "MENORCA",
                title_sub: "RUGBY CLUB",
                subtitle: "Vive la pasión del rugby en el corazón del Mediterráneo",
                join_team: "Únete al Equipo",
                learn_more: "Conoce Más"
            }
        };
    }

    // Utility method to format translations with variables
    formatTranslation(key, variables = {}) {
        let translation = this.getTranslation(key);
        if (!translation) return key;

        Object.keys(variables).forEach(variable => {
            translation = translation.replace(new RegExp(`{{${variable}}}`, 'g'), variables[variable]);
        });

        return translation;
    }

    // Get language direction (for RTL languages in the future)
    getLanguageDirection() {
        const rtlLanguages = ['ar', 'he', 'fa'];
        return rtlLanguages.includes(this.currentLanguage) ? 'rtl' : 'ltr';
    }

    // Get current language info
    getCurrentLanguageInfo() {
        const languages = {
            'es': { name: 'Español', nativeName: 'Español', flag: '<img src="https://flagcdn.com/w40/es.png" alt="ES" width="20" height="14">' },
            'ca': { name: 'Catalan', nativeName: 'Català', flag: '<img src="assets/images/static/flag-ca.svg" alt="CA" width="20" height="14">' },
            'en': { name: 'English', nativeName: 'English', flag: '<img src="https://flagcdn.com/w40/gb.png" alt="EN" width="20" height="14">' },
            'fr': { name: 'French', nativeName: 'Français', flag: '<img src="https://flagcdn.com/w40/fr.png" alt="FR" width="20" height="14">' },
            'it': { name: 'Italian', nativeName: 'Italiano', flag: '<img src="https://flagcdn.com/w40/it.png" alt="IT" width="20" height="14">' },
            'pt': { name: 'Portuguese', nativeName: 'Português', flag: '<img src="https://flagcdn.com/w40/pt.png" alt="PT" width="20" height="14">' }
        };

        return languages[this.currentLanguage] || languages['es'];
    }
}

// Initialize I18n system
let i18n;
document.addEventListener('DOMContentLoaded', () => {
    i18n = new I18nSystem();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18nSystem;
}