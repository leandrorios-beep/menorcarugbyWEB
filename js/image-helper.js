// ==========================================================================
// IMAGE HELPER FUNCTIONS
// Handles both .jpg and .jpeg extensions automatically
// ==========================================================================

function getImagePath(basePath, fileName) {
    // Return path with fallback handling for both .jpg and .jpeg
    const jpegPath = `${basePath}/${fileName}.jpeg`;
    const jpgPath = `${basePath}/${fileName}.jpg`;

    return {
        primary: jpegPath,
        fallback: jpgPath
    };
}

function setImageWithFallback(imgElement, basePath, fileName) {
    const paths = getImagePath(basePath, fileName);

    imgElement.src = paths.primary;
    imgElement.onerror = function() {
        this.onerror = null; // Prevent infinite loop
        this.src = paths.fallback;
        console.log(`Fallback loaded: ${this.src}`);
    };
}

// Update team images with fallback support
document.addEventListener('DOMContentLoaded', function() {
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
        // Try to load 1.jpeg, fallback to 1.jpg
        const img = new Image();
        img.onload = function() {
            heroSection.style.backgroundImage = `url('${this.src}')`;
        };
        img.onerror = function() {
            // Try fallback
            const fallbackImg = new Image();
            fallbackImg.onload = function() {
                heroSection.style.backgroundImage = `url('${this.src}')`;
            };
            fallbackImg.src = 'assets/images/static/1.jpg';
        };
        img.src = 'assets/images/static/1.jpeg';
    }
});