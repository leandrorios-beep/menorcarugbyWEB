/* ==========================================================================
   COOKIE CONSENT BANNER
   Checks localStorage and shows a GDPR/LSSI cookie notice if not accepted.
   ========================================================================== */

(function () {
    'use strict';

    if (localStorage.getItem('mrc_cookie_consent')) return;

    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de cookies');

    banner.innerHTML =
        '<div class="cookie-banner-content">' +
            '<p class="cookie-banner-text" data-i18n-cookie="text">' +
                'Usamos cookies propias para guardar tu preferencia de idioma. ' +
                'Tambien cargamos recursos externos (Google Maps, Google Fonts, Font Awesome). ' +
                'Al continuar navegando, aceptas su uso.' +
            '</p>' +
            '<div class="cookie-banner-actions">' +
                '<button class="cookie-btn-accept" id="cookieAccept" data-i18n-cookie="accept">Aceptar</button>' +
                '<a href="privacidad.html" class="cookie-btn-info" data-i18n-cookie="info">Mas info</a>' +
            '</div>' +
        '</div>';

    document.body.appendChild(banner);

    // Slide-up animation
    requestAnimationFrame(function () {
        banner.classList.add('cookie-banner-visible');
    });

    document.getElementById('cookieAccept').addEventListener('click', function () {
        localStorage.setItem('mrc_cookie_consent', 'accepted');
        banner.classList.remove('cookie-banner-visible');
        banner.addEventListener('transitionend', function () {
            banner.remove();
        });
    });

    // Translations
    var translations = {
        es: {
            text: 'Usamos cookies propias para guardar tu preferencia de idioma. Tambien cargamos recursos externos (Google Maps, Google Fonts, Font Awesome). Al continuar navegando, aceptas su uso.',
            accept: 'Aceptar',
            info: 'Mas info'
        },
        en: {
            text: 'We use our own cookies to save your language preference. We also load external resources (Google Maps, Google Fonts, Font Awesome). By continuing to browse, you accept their use.',
            accept: 'Accept',
            info: 'More info'
        },
        ca: {
            text: 'Usam cookies propies per guardar la teva preferencia d\'idioma. Tambe carreguem recursos externs (Google Maps, Google Fonts, Font Awesome). En continuar navegant, n\'acceptes l\'us.',
            accept: 'Acceptar',
            info: 'Mes info'
        },
        fr: {
            text: 'Nous utilisons des cookies pour enregistrer votre preference de langue. Nous chargeons egalement des ressources externes (Google Maps, Google Fonts, Font Awesome). En continuant a naviguer, vous acceptez leur utilisation.',
            accept: 'Accepter',
            info: 'Plus d\'infos'
        },
        it: {
            text: 'Utilizziamo cookie propri per salvare la tua preferenza linguistica. Carichiamo anche risorse esterne (Google Maps, Google Fonts, Font Awesome). Continuando a navigare, ne accetti l\'utilizzo.',
            accept: 'Accetta',
            info: 'Maggiori info'
        },
        pt: {
            text: 'Usamos cookies proprios para guardar a tua preferencia de idioma. Tambem carregamos recursos externos (Google Maps, Google Fonts, Font Awesome). Ao continuar a navegar, aceitas a sua utilizacao.',
            accept: 'Aceitar',
            info: 'Mais info'
        }
    };

    function updateCookieTranslations() {
        var lang = localStorage.getItem('menorca_rugby_lang') || 'es';
        var t = translations[lang] || translations.es;
        var els = banner.querySelectorAll('[data-i18n-cookie]');
        for (var i = 0; i < els.length; i++) {
            var key = els[i].getAttribute('data-i18n-cookie');
            if (t[key]) els[i].textContent = t[key];
        }
    }

    updateCookieTranslations();
    document.addEventListener('languageChanged', updateCookieTranslations);
})();
