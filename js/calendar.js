// ==========================================================================
// MENORCA RUGBY CLUB - CALENDAR MODULE
// Fetches and displays matches from API in a monthly calendar view
// ==========================================================================

const MatchesCalendar = {
    // API Configuration
    apiUrl: 'https://app.menorcarugbyclub.com/api/public/calendar',

    // State
    currentMonth: new Date(),
    selectedCategory: 'all',
    matches: [],
    allMatches: [], // For list view
    currentView: 'calendar', // 'calendar' or 'list'

    // Cache
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutes

    // Month names for different languages
    monthNames: {
        es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        ca: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
        fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
        it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
        pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    },

    // Day names for different languages
    dayNames: {
        es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        ca: ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'],
        fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
        it: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
        pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    },

    // Initialize calendar
    init() {
        // Check if we're on the home page or calendar page
        const upcomingBanner = document.getElementById('upcomingBanner');
        const calendarSection = document.getElementById('calendarGrid');

        // Always load all matches for the upcoming banner
        if (upcomingBanner) {
            this.loadAllMatches(); // This will render the banner
        }

        // Only initialize full calendar if we're on the calendar page
        if (calendarSection) {
            this.setupEventListeners();
            this.loadMatches(); // Load current month for calendar view
            this.checkUrlHash(); // Check if coming from #calendario
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Month navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.changeMonth(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.changeMonth(1);
            });
        }

        // Category filters
        const filterBtns = document.querySelectorAll('.calendar-filters .filter-chip');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all
                filterBtns.forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                // Update filter
                this.selectedCategory = btn.getAttribute('data-category');
                // Reload matches with new filter
                if (this.currentView === 'calendar') {
                    this.loadMatches(); // This will fetch filtered data and re-render
                } else {
                    this.renderFullListView();
                }
            });
        });

        // View toggle
        const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
        viewToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                console.log('📅 CALENDAR: Switching to view:', view);

                // Update active states
                viewToggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update current view
                this.currentView = view;

                // Toggle visibility
                this.switchView(view);
            });
        });
    },

    // Change month
    changeMonth(direction) {
        // Create a new Date object to avoid mutation issues
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        this.currentMonth = new Date(year, month + direction, 1);
        this.loadMatches();
    },

    // Get current language
    getCurrentLanguage() {
        return (typeof i18n !== 'undefined' && i18n.currentLanguage) ? i18n.currentLanguage : 'es';
    },

    // Load matches from API
    async loadMatches() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');

        // Update month display
        this.updateMonthDisplay();

        // Show loading
        this.showLoading();

        // Check cache
        const cacheKey = `${year}-${monthStr}-${this.selectedCategory}`;
        const cached = this.cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
            console.log('📅 CALENDAR: Using cached data');
            this.matches = cached.data;
            this.renderCalendar();
            return;
        }

        try {
            // Calculate date range for current month
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);

            const fromDate = this.formatDate(firstDay);
            const toDate = this.formatDate(lastDay);

            // Build API URL
            let apiUrl = `${this.apiUrl}?from=${fromDate}&to=${toDate}`;

            // Add category filter if not "all"
            if (this.selectedCategory !== 'all') {
                apiUrl += `&category=${this.selectedCategory}`;
            }

            console.log('📅 CALENDAR: Fetching from API:', apiUrl);

            // Fetch data
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            console.log('📅 CALENDAR: API Response:', data);

            if (!data.success) {
                throw new Error('API returned success: false');
            }

            this.matches = data.matches || [];

            // Log first few matches for debugging
            if (this.matches.length > 0) {
                console.log('📅 CALENDAR: Sample match data:', this.matches[0]);
            }

            // Cache the result
            this.cache.set(cacheKey, {
                data: this.matches,
                timestamp: Date.now()
            });

            console.log(`📅 CALENDAR: Loaded ${this.matches.length} matches for ${year}-${monthStr}`);

            // Render calendar
            this.renderCalendar();

        } catch (error) {
            console.error('❌ CALENDAR: Error loading matches:', error);
            this.showError();
        }
    },

    // Format date as YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Update month display
    updateMonthDisplay() {
        const monthElement = document.getElementById('currentMonth');
        if (!monthElement) return;

        const lang = this.getCurrentLanguage();
        const monthNames = this.monthNames[lang] || this.monthNames.es;

        const month = monthNames[this.currentMonth.getMonth()];
        const year = this.currentMonth.getFullYear();

        monthElement.textContent = `${month} ${year}`;
    },

    // Show loading state
    showLoading() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        const lang = this.getCurrentLanguage();
        const loadingText = {
            es: 'Cargando partidos...',
            en: 'Loading matches...',
            ca: 'Carregant partits...',
            fr: 'Chargement des matchs...',
            it: 'Caricamento partite...',
            pt: 'Carregando jogos...'
        };

        grid.innerHTML = `
            <div class="calendar-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${loadingText[lang] || loadingText.es}</span>
            </div>
        `;
    },

    // Show error state
    showError() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        const lang = this.getCurrentLanguage();
        const errorText = {
            es: 'Error al cargar los partidos. Intenta de nuevo más tarde.',
            en: 'Error loading matches. Please try again later.',
            ca: 'Error en carregar els partits. Prova-ho més tard.',
            fr: 'Erreur lors du chargement des matchs. Réessayez plus tard.',
            it: 'Errore nel caricamento delle partite. Riprova più tardi.',
            pt: 'Erro ao carregar os jogos. Tente novamente mais tarde.'
        };

        grid.innerHTML = `
            <div class="calendar-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>${errorText[lang] || errorText.es}</p>
            </div>
        `;
    },

    // Render calendar
    renderCalendar() {
        console.log('📅 CALENDAR: renderCalendar() called');
        const grid = document.getElementById('calendarGrid');
        const matchesList = document.getElementById('matchesList');

        console.log('📅 CALENDAR: Grid element:', !!grid);
        console.log('📅 CALENDAR: MatchesList element:', !!matchesList);
        console.log('📅 CALENDAR: Matches to render:', this.matches.length);

        if (!grid) {
            console.error('❌ CALENDAR: Grid element not found in renderCalendar()');
            return;
        }

        // Check if mobile or desktop
        const isMobile = window.innerWidth <= 768;
        console.log('📅 CALENDAR: Is mobile?', isMobile, '- Window width:', window.innerWidth);

        if (isMobile) {
            // Render as list on mobile
            console.log('📅 CALENDAR: Rendering as list (mobile)');
            this.renderMatchesList(matchesList);
            grid.style.display = 'none';
            if (matchesList) matchesList.style.display = 'block';
        } else {
            // Render as calendar on desktop
            console.log('📅 CALENDAR: Rendering as calendar grid (desktop)');
            this.renderCalendarGrid(grid);
            grid.style.display = 'grid';
            if (matchesList) matchesList.style.display = 'none';
        }
    },

    // Render calendar grid (desktop)
    renderCalendarGrid(grid) {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const lang = this.getCurrentLanguage();
        const dayNames = this.dayNames[lang] || this.dayNames.es;

        let html = '<div class="calendar-weekdays">';

        // Day headers
        dayNames.forEach(day => {
            html += `<div class="calendar-weekday">${day}</div>`;
        });

        html += '</div><div class="calendar-days">';

        // Empty cells before first day
        for (let i = 0; i < startingDayOfWeek; i++) {
            html += '<div class="calendar-day calendar-day-empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dateStr = this.formatDate(currentDate);
            const dayMatches = this.matches.filter(m => m.date === dateStr);

            const isToday = this.isToday(currentDate);
            const todayClass = isToday ? 'calendar-day-today' : '';

            html += `<div class="calendar-day ${todayClass}" data-date="${dateStr}">`;
            html += `<span class="calendar-day-number">${day}</span>`;

            if (dayMatches.length > 0) {
                html += '<div class="calendar-matches">';
                dayMatches.forEach(match => {
                    html += this.renderMatchBadge(match);
                });
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';

        // Show empty state if no matches
        if (this.matches.length === 0) {
            const emptyText = {
                es: 'No hay partidos programados para este mes',
                en: 'No matches scheduled for this month',
                ca: 'No hi ha partits programats per aquest mes',
                fr: 'Aucun match prévu pour ce mois',
                it: 'Nessuna partita programmata per questo mese',
                pt: 'Nenhum jogo agendado para este mês'
            };

            html += `
                <div class="calendar-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>${emptyText[lang] || emptyText.es}</p>
                </div>
            `;
        }

        grid.innerHTML = html;

        // Add click events to matches
        this.addMatchClickEvents();
    },

    // Render matches list (mobile)
    renderMatchesList(listContainer) {
        if (!listContainer) return;

        const lang = this.getCurrentLanguage();

        if (this.matches.length === 0) {
            const emptyText = {
                es: 'No hay partidos programados para este mes',
                en: 'No matches scheduled for this month',
                ca: 'No hi ha partits programats per aquest mes',
                fr: 'Aucun match prévu pour ce mois',
                it: 'Nessuna partita programmata per questo mese',
                pt: 'Nenhum jogo agendado para este mês'
            };

            listContainer.innerHTML = `
                <div class="calendar-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>${emptyText[lang] || emptyText.es}</p>
                </div>
            `;
            return;
        }

        let html = '<div class="matches-list-container">';

        // Group matches by date
        const matchesByDate = this.groupMatchesByDate(this.matches);

        Object.keys(matchesByDate).sort().forEach(dateStr => {
            const matches = matchesByDate[dateStr];
            const date = new Date(dateStr + 'T00:00:00');

            html += `<div class="match-date-group">`;
            html += `<h4 class="match-date-header">${this.formatDateLong(date, lang)}</h4>`;

            matches.forEach(match => {
                html += this.renderMatchCard(match);
            });

            html += `</div>`;
        });

        html += '</div>';

        listContainer.innerHTML = html;
    },

    // Group matches by date
    groupMatchesByDate(matches) {
        return matches.reduce((groups, match) => {
            const date = match.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(match);
            return groups;
        }, {});
    },

    // Render match badge (for calendar grid)
    renderMatchBadge(match) {
        const categoryClass = this.getCategoryClass(match.category);
        const homeAway = match.is_home ? '🏠' : '✈️';
        const statusText = match.status === 'confirmed' ? 'Confirmado' :
                          match.status === 'planned' ? 'Planificado' :
                          match.status === 'cancelled' ? 'Cancelado' : 'Planificado';
        const statusClass = `status-${match.status || 'planned'}`;

        return `
            <div class="match-badge ${categoryClass}" data-match-id="${match.id}" title="${match.category} - ${match.opponent} - ${match.time}">
                <div class="match-badge-header">
                    <span class="match-category-label">${match.category}</span>
                    <span class="match-time">${match.time}</span>
                </div>
                <div class="match-badge-body">
                    <span class="match-icon">${homeAway}</span>
                    <span class="match-opponent">${this.truncate(match.opponent, 12)}</span>
                </div>
                <div class="match-status-mini ${statusClass}">${statusText}</div>
            </div>
        `;
    },

    // Render match card (for mobile list)
    renderMatchCard(match) {
        const categoryClass = this.getCategoryClass(match.category);
        const lang = this.getCurrentLanguage();

        const homeAwayText = {
            es: match.is_home ? 'Local' : 'Visitante',
            en: match.is_home ? 'Home' : 'Away',
            ca: match.is_home ? 'Local' : 'Visitant',
            fr: match.is_home ? 'Domicile' : 'Extérieur',
            it: match.is_home ? 'Casa' : 'Trasferta',
            pt: match.is_home ? 'Casa' : 'Fora'
        };

        const statusBadge = this.getStatusBadge(match.status, lang);
        const resultBadge = match.result ? `<div class="match-result">${match.result}</div>` : '';

        return `
            <div class="match-card ${categoryClass}" data-match-id="${match.id}">
                <div class="match-card-header">
                    <span class="match-category-badge">${match.category}</span>
                    ${statusBadge}
                </div>
                <div class="match-card-body">
                    <div class="match-info">
                        <div class="match-teams">
                            <span class="match-team">Menorca Rugby</span>
                            <span class="match-vs">vs</span>
                            <span class="match-opponent-name">${match.opponent}</span>
                        </div>
                        ${resultBadge}
                    </div>
                    <div class="match-details">
                        <div class="match-detail">
                            <i class="fas fa-clock"></i>
                            <span>${match.time}</span>
                        </div>
                        <div class="match-detail">
                            <i class="fas ${match.is_home ? 'fa-home' : 'fa-plane'}"></i>
                            <span>${homeAwayText[lang] || homeAwayText.es}</span>
                        </div>
                        ${match.location ? `
                            <div class="match-detail">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${match.location}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // Get status badge
    getStatusBadge(status, lang) {
        const statusText = {
            confirmed: {
                es: 'Confirmado',
                en: 'Confirmed',
                ca: 'Confirmat',
                fr: 'Confirmé',
                it: 'Confermato',
                pt: 'Confirmado'
            },
            pending: {
                es: 'Pendiente',
                en: 'Pending',
                ca: 'Pendent',
                fr: 'En attente',
                it: 'In attesa',
                pt: 'Pendente'
            },
            cancelled: {
                es: 'Cancelado',
                en: 'Cancelled',
                ca: 'Cancel·lat',
                fr: 'Annulé',
                it: 'Annullato',
                pt: 'Cancelado'
            },
            finished: {
                es: 'Finalizado',
                en: 'Finished',
                ca: 'Finalitzat',
                fr: 'Terminé',
                it: 'Finito',
                pt: 'Finalizado'
            }
        };

        const text = statusText[status] ? statusText[status][lang] || statusText[status].es : status;
        const statusClass = `status-${status}`;

        return `<span class="match-status-badge ${statusClass}">${text}</span>`;
    },

    // Get category class
    getCategoryClass(category) {
        return `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
    },

    // Check if date is today
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    },

    // Format date (long format)
    formatDateLong(date, lang) {
        const dayNames = {
            es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
            en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            ca: ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'],
            fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
            it: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
            pt: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        };

        const monthNames = this.monthNames[lang] || this.monthNames.es;
        const days = dayNames[lang] || dayNames.es;

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = monthNames[date.getMonth()];

        return `${dayName}, ${day} de ${month}`;
    },

    // Truncate text
    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // Add click events to matches
    addMatchClickEvents() {
        const matchBadges = document.querySelectorAll('.match-badge, .match-card');
        matchBadges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchId = badge.getAttribute('data-match-id');
                this.showMatchDetails(matchId);
            });
        });
    },

    // Show match details (could open a modal in the future)
    showMatchDetails(matchId) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return;

        console.log('📅 CALENDAR: Match details:', match);

        // For now, just log. In the future, could open a modal with full details
        // this.openMatchModal(match);
    },

    // Load ALL matches (for list view and upcoming banner)
    async loadAllMatches() {
        console.log('📅 CALENDAR: Loading all matches...');

        try {
            // Fetch all matches without date range
            const response = await fetch(this.apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error('API returned success: false');
            }

            this.allMatches = data.matches || [];
            console.log(`📅 CALENDAR: Loaded ${this.allMatches.length} total matches`);

            if (this.allMatches.length > 0) {
                console.log('📅 CALENDAR: Sample of all matches:', this.allMatches.slice(0, 3));
            }

            // Render upcoming matches banner
            this.renderUpcomingBanner();

        } catch (error) {
            console.error('❌ CALENDAR: Error loading all matches:', error);
        }
    },

    // Switch between calendar and list view
    switchView(view) {
        const calendarNav = document.querySelector('.calendar-nav');
        const calendarGrid = document.getElementById('calendarGrid');
        const matchesList = document.getElementById('matchesList');

        if (view === 'list') {
            // Hide calendar-specific elements
            calendarNav.style.display = 'none';
            calendarGrid.style.display = 'none';
            matchesList.style.display = 'block';

            // Load all matches if not already loaded
            if (this.allMatches.length === 0) {
                console.log('📅 CALENDAR: Loading all matches for list view...');
                this.loadAllMatches().then(() => {
                    this.renderFullListView();
                });
            } else {
                // Render full list with existing data
                this.renderFullListView();
            }
        } else {
            // Show calendar-specific elements
            calendarNav.style.display = 'flex';
            calendarGrid.style.display = 'grid';
            matchesList.style.display = 'none';

            // Render calendar
            this.renderCalendar();
        }
    },

    // Render full list view with all matches
    renderFullListView() {
        const matchesList = document.getElementById('matchesList');
        if (!matchesList) return;

        const lang = this.getCurrentLanguage();

        // Filter matches by category - improved to handle composite categories
        let filteredMatches = this.allMatches;
        if (this.selectedCategory !== 'all') {
            filteredMatches = this.allMatches.filter(m => {
                const matchCategory = (m.category || '').toUpperCase();
                const filterCategory = this.selectedCategory.toUpperCase();

                // Special case for RUGBY DAY - only show in younger categories (SUB6, SUB8, SUB10, SUB12)
                if (matchCategory.includes('RUGBY DAY')) {
                    const youngerCategories = ['SUB6', 'SUB8', 'SUB10', 'SUB12'];
                    return youngerCategories.includes(filterCategory);
                }

                // Check if the match category contains the filter category
                // Try both with and without space: "SUB18" or "SUB 18"
                const withSpace = filterCategory.replace(/(\d+)/, ' $1');
                return matchCategory.includes(filterCategory) || matchCategory.includes(withSpace);
            });
        }

        if (filteredMatches.length === 0) {
            const emptyText = {
                es: 'No hay partidos programados',
                en: 'No matches scheduled',
                ca: 'No hi ha partits programats',
                fr: 'Aucun match prévu',
                it: 'Nessuna partita programmata',
                pt: 'Nenhum jogo agendado'
            };

            matchesList.innerHTML = `
                <div class="calendar-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>${emptyText[lang] || emptyText.es}</p>
                </div>
            `;
            return;
        }

        // Sort by date
        filteredMatches.sort((a, b) => new Date(a.date) - new Date(b.date));

        let html = '<div class="matches-list-container">';

        // Group by month
        const matchesByMonth = this.groupMatchesByMonth(filteredMatches);

        Object.keys(matchesByMonth).sort().forEach(monthKey => {
            const matches = matchesByMonth[monthKey];
            const [year, month] = monthKey.split('-');
            const monthNames = this.monthNames[lang] || this.monthNames.es;
            const monthName = monthNames[parseInt(month) - 1];

            html += `<div class="month-group">`;
            html += `<h3 class="month-group-header">${monthName} ${year}</h3>`;

            // Group by date within month
            const matchesByDate = this.groupMatchesByDate(matches);

            Object.keys(matchesByDate).sort().forEach(dateStr => {
                const dayMatches = matchesByDate[dateStr];
                const date = new Date(dateStr + 'T00:00:00');

                html += `<div class="match-date-group">`;
                html += `<h4 class="match-date-header">${this.formatDateLong(date, lang)}</h4>`;

                dayMatches.forEach(match => {
                    html += this.renderMatchCard(match);
                });

                html += `</div>`;
            });

            html += `</div>`;
        });

        html += '</div>';

        matchesList.innerHTML = html;
    },

    // Group matches by month
    groupMatchesByMonth(matches) {
        return matches.reduce((groups, match) => {
            const monthKey = match.date.substring(0, 7); // YYYY-MM
            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(match);
            return groups;
        }, {});
    },

    // Check URL hash for scroll
    checkUrlHash() {
        if (window.location.hash === '#calendario') {
            const section = document.getElementById('calendario');
            if (section) {
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth' });
                }, 500);
            }
        }
    },

    // Render upcoming matches banner
    renderUpcomingBanner() {
        const banner = document.getElementById('upcomingBanner');
        if (!banner) return;

        const lang = this.getCurrentLanguage();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get upcoming matches per category
        const upcomingByCategory = {};
        const categories = ['SENIOR', 'FEMENINO', 'SUB18', 'SUB16', 'SUB14', 'SUB12', 'SUB10', 'SUB8', 'SUB6'];

        // First, handle Rugby Day separately (consolidate SUB8, SUB10, SUB12 as RUGBY DAY)
        const rugbyDayMatches = this.allMatches
            .filter(m => {
                const matchCategory = (m.category || '').toUpperCase();
                // Include Rugby Day OR SUB8/SUB10/SUB12 (they're all Rugby Day events)
                return matchCategory.includes('RUGBY DAY') ||
                       matchCategory.includes('SUB8') ||
                       matchCategory.includes('SUB 8') ||
                       matchCategory.includes('SUB10') ||
                       matchCategory.includes('SUB 10') ||
                       matchCategory.includes('SUB12') ||
                       matchCategory.includes('SUB 12');
            })
            .filter(m => {
                // Exclude postponed and cancelled matches
                const status = (m.status || '').toLowerCase();
                if (status === 'postponed' || status === 'cancelled' || status === 'canceled') {
                    return false;
                }

                const matchDate = new Date(m.date + 'T00:00:00');
                matchDate.setHours(0, 0, 0, 0);
                return matchDate >= today;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (rugbyDayMatches.length > 0) {
            const nextRugbyDay = rugbyDayMatches[0];
            const matchDate = new Date(nextRugbyDay.date + 'T00:00:00');
            matchDate.setHours(0, 0, 0, 0);
            const diffTime = matchDate.getTime() - today.getTime();
            const daysUntil = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            upcomingByCategory['RUGBY DAY'] = {
                match: nextRugbyDay,
                daysUntil: daysUntil
            };
        }

        // Then handle regular categories (excluding Rugby Day and SUB8/10/12)
        categories.forEach(category => {
            const categoryMatches = this.allMatches
                .filter(m => {
                    const matchCategory = (m.category || '').toUpperCase();

                    // Skip Rugby Day matches (already handled above)
                    if (matchCategory.includes('RUGBY DAY')) {
                        return false;
                    }

                    // Skip SUB8, SUB10, SUB12 (they're consolidated as Rugby Day)
                    if (matchCategory.includes('SUB8') || matchCategory.includes('SUB 8') ||
                        matchCategory.includes('SUB10') || matchCategory.includes('SUB 10') ||
                        matchCategory.includes('SUB12') || matchCategory.includes('SUB 12')) {
                        return false;
                    }

                    const filterCategory = category.toUpperCase();

                    // Check if the match category contains the filter category
                    // Try both with and without space: "SUB18" or "SUB 18"
                    const withSpace = filterCategory.replace(/(\d+)/, ' $1');
                    return matchCategory.includes(filterCategory) || matchCategory.includes(withSpace);
                })
                .filter(m => {
                    // Exclude postponed and cancelled matches
                    const status = (m.status || '').toLowerCase();
                    if (status === 'postponed' || status === 'cancelled' || status === 'canceled') {
                        return false;
                    }

                    const matchDate = new Date(m.date + 'T00:00:00');
                    matchDate.setHours(0, 0, 0, 0);
                    return matchDate >= today;
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (categoryMatches.length > 0) {
                const nextMatch = categoryMatches[0];
                // Parse date correctly with local timezone
                const matchDate = new Date(nextMatch.date + 'T00:00:00');
                matchDate.setHours(0, 0, 0, 0);

                // Calculate difference in days
                const diffTime = matchDate.getTime() - today.getTime();
                const daysUntil = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                upcomingByCategory[category] = {
                    match: nextMatch,
                    daysUntil: daysUntil
                };
            }
        });

        if (Object.keys(upcomingByCategory).length === 0) {
            banner.style.display = 'none';
            return;
        }

        // Render banner
        const titleText = {
            es: '🏉 Próximos Partidos',
            en: '🏉 Upcoming Matches',
            ca: '🏉 Pròxims Partits',
            fr: '🏉 Prochains Matchs',
            it: '🏉 Prossime Partite',
            pt: '🏉 Próximos Jogos'
        };

        const todayText = {
            es: '¡Hoy!',
            en: 'Today!',
            ca: 'Avui!',
            fr: 'Aujourd\'hui!',
            it: 'Oggi!',
            pt: 'Hoje!'
        };

        const daysText = {
            es: (n) => n === 1 ? 'Falta 1 día' : `Faltan ${n} días`,
            en: (n) => n === 1 ? '1 day left' : `${n} days left`,
            ca: (n) => n === 1 ? 'Falta 1 dia' : `Falten ${n} dies`,
            fr: (n) => n === 1 ? 'Dans 1 jour' : `Dans ${n} jours`,
            it: (n) => n === 1 ? 'Manca 1 giorno' : `Mancano ${n} giorni`,
            pt: (n) => n === 1 ? 'Falta 1 dia' : `Faltam ${n} dias`
        };

        const viewCalendarText = {
            es: 'Ver Calendario Completo',
            en: 'View Full Calendar',
            ca: 'Veure Calendari Complet',
            fr: 'Voir Calendrier Complet',
            it: 'Vedi Calendario Completo',
            pt: 'Ver Calendário Completo'
        };

        // Sort by days until match (nearest first)
        const sortedMatches = Object.entries(upcomingByCategory)
            .sort((a, b) => a[1].daysUntil - b[1].daysUntil);

        let html = '<div class="upcoming-banner-container">';
        html += `<h3 class="upcoming-banner-title">${titleText[lang] || titleText.es}</h3>`;
        html += '<div class="upcoming-cards">';

        sortedMatches.forEach(([category, data]) => {
            const categoryClass = this.getCategoryClass(category);
            const timeText = data.daysUntil === 0
                ? todayText[lang] + ' ' + data.match.time
                : daysText[lang](data.daysUntil);

            html += `
                <div class="upcoming-card ${categoryClass}">
                    <div class="upcoming-card-category">${category}</div>
                    <div class="upcoming-card-time">${timeText}</div>
                    <div class="upcoming-card-opponent">${data.match.opponent}</div>
                    <div class="upcoming-card-location">${data.match.is_home ? '🏠' : '✈️'} ${data.match.location}</div>
                </div>
            `;
        });

        html += '</div>';
        html += `<div class="upcoming-cta"><a href="calendar.html" class="upcoming-btn">${viewCalendarText[lang] || viewCalendarText.es} <i class="fas fa-arrow-right"></i></a></div>`;
        html += '</div>';

        banner.innerHTML = html;
        banner.style.display = 'block';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize immediately for instant rendering
    MatchesCalendar.init();
});

// Re-render on window resize
window.addEventListener('resize', debounce(() => {
    if (MatchesCalendar.matches.length > 0) {
        MatchesCalendar.renderCalendar();
    }
}, 250));

// Helper: Debounce function
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
