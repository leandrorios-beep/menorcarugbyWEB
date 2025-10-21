// ==========================================================================
// CALENDAR 2 - TABLE VIEW
// Displays all matches in a table format
// ==========================================================================

const MatchesTable = {
    apiUrl: 'https://app.menorcarugbyclub.com/api/public/calendar',
    matches: [],
    selectedCategory: 'all',

    async init() {
        console.log('📋 TABLE VIEW: Initializing...');
        this.setupFilters();
        await this.loadAllMatches();
    },

    setupFilters() {
        const filterBtns = document.querySelectorAll('.calendar-filters .filter-chip');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedCategory = btn.getAttribute('data-category');
                this.renderTable();
            });
        });
    },

    async loadAllMatches() {
        console.log('📋 TABLE VIEW: Loading all matches...');
        const tableContainer = document.getElementById('matchesTable');

        if (!tableContainer) {
            console.error('❌ TABLE VIEW: No table container found');
            return;
        }

        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error('API returned success: false');
            }

            this.matches = data.matches || [];
            console.log(`📋 TABLE VIEW: Loaded ${this.matches.length} matches`);

            this.renderTable();

        } catch (error) {
            console.error('❌ TABLE VIEW: Error loading matches:', error);
            tableContainer.innerHTML = `
                <div class="calendar-error" style="padding: 2rem; text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                    <p>Error al cargar los partidos. Intenta de nuevo más tarde.</p>
                </div>
            `;
        }
    },

    renderTable() {
        const tableContainer = document.getElementById('matchesTable');
        if (!tableContainer) return;

        // Filter matches - improved to handle composite categories
        let filteredMatches = this.matches;
        if (this.selectedCategory !== 'all') {
            filteredMatches = this.matches.filter(m => {
                const matchCategory = (m.category || '').toUpperCase();
                const filterCategory = this.selectedCategory.toUpperCase();

                // Special case for RUGBY DAY - only show in younger categories (SUB6, SUB8, SUB10, SUB12)
                if (matchCategory.includes('RUGBY DAY')) {
                    const youngerCategories = ['SUB6', 'SUB8', 'SUB10', 'SUB12'];
                    return youngerCategories.includes(filterCategory);
                }

                // Check if the match category contains the filter category
                // This handles cases like "SUB 10 Y SUB 8" matching both "SUB10" and "SUB8"
                return matchCategory.includes(filterCategory.replace(/(\d+)/, ' $1'));
            });
        }

        // Sort by date
        filteredMatches.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (filteredMatches.length === 0) {
            tableContainer.innerHTML = `
                <div class="calendar-empty" style="padding: 3rem; text-align: center;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: #95a5a6; margin-bottom: 1rem;"></i>
                    <p>No hay partidos programados para esta categoría</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="overflow-x: auto;">
                <table class="matches-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Categoría</th>
                            <th>Competición</th>
                            <th>Oponente</th>
                            <th>Local/Visit.</th>
                            <th>Ubicación</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredMatches.forEach(match => {
            const date = new Date(match.date + 'T00:00:00');
            const formattedDate = this.formatDate(date);
            const homeAway = match.is_home ? '🏠 Local' : '✈️ Visitante';
            const statusClass = this.getStatusClass(match.status);
            const statusText = this.getStatusText(match.status);

            html += `
                <tr>
                    <td data-label="Fecha">${formattedDate}</td>
                    <td data-label="Hora">${match.time}</td>
                    <td data-label="Categoría">
                        <span class="category-badge ${this.getCategoryClass(match.category)}">${match.category}</span>
                    </td>
                    <td data-label="Competición">${match.competition_type || 'Rugby XV'}</td>
                    <td data-label="Oponente"><strong>${match.opponent}</strong></td>
                    <td data-label="Local/Visit.">${homeAway}</td>
                    <td data-label="Ubicación">${match.location}</td>
                    <td data-label="Estado">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #666;">
                    <strong>${filteredMatches.length}</strong> partidos en total
                </p>
            </div>
        `;

        tableContainer.innerHTML = html;
    },

    formatDate(date) {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName} ${day} ${month} ${year}`;
    },

    getCategoryClass(category) {
        return `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
    },

    getStatusClass(status) {
        return `status-${status}`;
    },

    getStatusText(status) {
        const statusMap = {
            'confirmed': 'Confirmado',
            'planned': 'Planificado',
            'cancelled': 'Cancelado',
            'finished': 'Finalizado'
        };
        return statusMap[status] || status;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Calendar Table View');
    setTimeout(() => {
        MatchesTable.init();
    }, 500);
});
