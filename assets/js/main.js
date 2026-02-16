let youAreHereBoid = null;
let manualControlEnabled = false;
let keyboardInput = { up: false, down: false, left: false, right: false };
let proximityColoringEnabled = false;
let proximityColorClose = '#ff6b6b'; // Color for boids close to neighbors
let proximityColorFar = '#4ecdc4'; // Color for boids far from neighbors
let proximityColorCloseRgb = hexToRgb(proximityColorClose);
let proximityColorFarRgb = hexToRgb(proximityColorFar);
const selectedBoidColor = 'rgba(0, 123, 255, 1)'; // Deep vibrant blue (reverted)
const defaultBoidColor = 'rgba(249, 253, 249, 0.7)'; // Default Off-White for boids

// Navigation functionality
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.nav-links a[data-section], .cta-button[data-section], .logo[data-section]');
    const sections = document.querySelectorAll('.section');
    const canvas = document.getElementById('flocking-canvas');
    const mainContent = document.querySelector('main');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinksContainer = document.querySelector('.nav-links');
    const logoWordmark = document.querySelector('.logo-wordmark');
    let logoMetricsQueued = false;

    function syncWordmarkMetrics() {
        if (!logoWordmark) return;

        const segments = logoWordmark.querySelectorAll('.logo-segment');

        segments.forEach(segment => {
            const tail = segment.querySelector('.logo-tail');
            if (!tail) return;

            const measuredTailWidth = Math.ceil(tail.scrollWidth);
            tail.style.setProperty('--logo-tail-width', `${measuredTailWidth}px`);
            tail.style.setProperty('--collapse-shift', `${-measuredTailWidth}px`);
        });
    }

    function queueWordmarkMetricsSync() {
        if (logoMetricsQueued) return;
        logoMetricsQueued = true;
        requestAnimationFrame(() => {
            logoMetricsQueued = false;
            syncWordmarkMetrics();
        });
    }

    function closeMobileMenu() {
        navLinksContainer.classList.remove('show');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function updateLogoState(targetSection) {
        if (!logoWordmark) return;
        logoWordmark.classList.toggle('is-condensed', targetSection !== 'home');
    }

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', function () {
        const isOpen = navLinksContainer.classList.toggle('show');
        mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    syncWordmarkMetrics();
    queueWordmarkMetricsSync();
    window.addEventListener('resize', queueWordmarkMetricsSync);
    if (document.fonts?.ready) {
        document.fonts.ready.then(queueWordmarkMetricsSync);
    }

    function showSection(targetSection) {
        if (!targetSection) return;

        const target = document.getElementById(targetSection);
        if (!target) return;

        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
        });
        target.classList.add('active');

        // Scroll the main container to the top so content is visible immediately
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        // Update active nav link
        document.querySelectorAll('.nav-links a[data-section]').forEach(link => {
            link.classList.remove('active');
        });

        const activeNavLink = document.querySelector(`.nav-links a[data-section="${targetSection}"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }

        history.replaceState(null, '', `#${targetSection}`);

        // Adjust simulation opacity
        if (targetSection === 'home') {
            canvas.style.opacity = '0.9'; // Homepage opacity
        } else {
            canvas.style.opacity = '0.2'; // Subtle opacity for all other sections
        }

        updateLogoState(targetSection);

        // Close mobile menu
        closeMobileMenu();
    }

    // Add click listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
        });
    });

    const initialSection = window.location.hash.replace('#', '');
    if (initialSection && document.getElementById(initialSection)) {
        showSection(initialSection);
    } else {
        showSection('home');
    }

    // Initialize flocking simulation
    initFlockingSimulation();

    const youAreHereButton = document.getElementById('youAreHereButton');
    if (youAreHereButton) {
        youAreHereButton.addEventListener('click', () => {
            if (window.boids && window.boids.length > 0) {
                const randomIndex = Math.floor(Math.random() * window.boids.length);
                youAreHereBoid = window.boids[randomIndex];
            }
        });
    }

    const manualControlButton = document.getElementById('manualControlButton');
    if (manualControlButton) {
        manualControlButton.addEventListener('click', () => {
            manualControlEnabled = !manualControlEnabled;

            if (manualControlEnabled) {
                if (!youAreHereBoid && window.boids && window.boids.length > 0) {
                    // If no boid is selected, select one automatically
                    const randomIndex = Math.floor(Math.random() * window.boids.length);
                    youAreHereBoid = window.boids[randomIndex];
                }
                manualControlButton.textContent = 'Release Control';
                manualControlButton.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
            } else {
                manualControlButton.textContent = 'Take Control';
                manualControlButton.style.backgroundColor = 'rgba(89, 95, 87, 0.8)';
                // Reset keyboard input when disabling control
                keyboardInput = { up: false, down: false, left: false, right: false };
            }
        });
    }

    // Proximity coloring controls
    const proximityColorToggle = document.getElementById('proximityColorToggle');
    const proximityColorPickerClose = document.getElementById('proximityColorPickerClose');
    const proximityColorPickerFar = document.getElementById('proximityColorPickerFar');
    proximityColorCloseRgb = hexToRgb(proximityColorClose);
    proximityColorFarRgb = hexToRgb(proximityColorFar);

    if (proximityColorToggle) {
        proximityColorToggle.addEventListener('change', (e) => {
            proximityColoringEnabled = e.target.checked;
        });
    }

    if (proximityColorPickerClose) {
        proximityColorPickerClose.addEventListener('input', (e) => {
            proximityColorClose = e.target.value;
            proximityColorCloseRgb = hexToRgb(proximityColorClose);
        });
    }

    if (proximityColorPickerFar) {
        proximityColorPickerFar.addEventListener('input', (e) => {
            proximityColorFar = e.target.value;
            proximityColorFarRgb = hexToRgb(proximityColorFar);
        });
    }

    // Keyboard event listeners for manual control
    document.addEventListener('keydown', (e) => {
        if (!manualControlEnabled || !youAreHereBoid) return;

        switch (e.key) {
            case 'ArrowUp':
                keyboardInput.up = true;
                e.preventDefault();
                break;
            case 'ArrowDown':
                keyboardInput.down = true;
                e.preventDefault();
                break;
            case 'ArrowLeft':
                keyboardInput.left = true;
                e.preventDefault();
                break;
            case 'ArrowRight':
                keyboardInput.right = true;
                e.preventDefault();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (!manualControlEnabled || !youAreHereBoid) return;

        switch (e.key) {
            case 'ArrowUp':
                keyboardInput.up = false;
                e.preventDefault();
                break;
            case 'ArrowDown':
                keyboardInput.down = false;
                e.preventDefault();
                break;
            case 'ArrowLeft':
                keyboardInput.left = false;
                e.preventDefault();
                break;
            case 'ArrowRight':
                keyboardInput.right = false;
                e.preventDefault();
                break;
        }
    });

});

// Color utility functions
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function interpolateColor(color1, color2, factor) {
    return {
        r: Math.round(color1.r + factor * (color2.r - color1.r)),
        g: Math.round(color1.g + factor * (color2.g - color1.g)),
        b: Math.round(color1.b + factor * (color2.b - color1.b))
    };
}

function getProximityColor(distance, maxDistance, closeColor, farColor) {
    const closeRgb = closeColor;
    const farRgb = farColor;

    if (!closeRgb || !farRgb) return defaultBoidColor;

    // Normalize distance (0 = very close, 1 = far away)
    const normalizedDistance = maxDistance > 0 ? Math.min(distance / maxDistance, 1) : 1;

    // Interpolate between close color and far color
    const interpolated = interpolateColor(closeRgb, farRgb, normalizedDistance);

    // Keep high alpha for bold colors
    const alpha = 0.9;

    return `rgba(${interpolated.r}, ${interpolated.g}, ${interpolated.b}, ${alpha})`;
}

// Flocking Simulation Code
function initFlockingSimulation() {
    const canvas = document.getElementById('flocking-canvas');
    const ctx = canvas.getContext('2d');

    // Get the font family for boids once
    const computedStyleForBoids = getComputedStyle(document.documentElement);
    const boidFontFamily = computedStyleForBoids.getPropertyValue('--font-heading').trim();

    // Spatial Grid for optimization
    class SpatialGrid {
        constructor(width, height, cellSize) {
            this.cellSize = cellSize;
            this.width = width;
            this.height = height;
            this.initCells();
        }

        initCells() {
            this.cols = Math.ceil(this.width / this.cellSize);
            this.rows = Math.ceil(this.height / this.cellSize);
            this.cells = new Array(this.cols * this.rows).fill(null).map(() => []);
        }

        resize(width, height) {
            this.width = width;
            this.height = height;
            this.initCells();
        }

        clear() {
            for (let i = 0; i < this.cells.length; i++) {
                this.cells[i].length = 0;
            }
        }

        add(boid) {
            const col = Math.floor(boid.x / this.cellSize);
            const row = Math.floor(boid.y / this.cellSize);
            // Handle boundary conditions
            if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                this.cells[row * this.cols + col].push(boid);
            }
        }

        // Get potential neighbors from adjacent cells
        getPotentialNeighbors(boid) {
            const col = Math.floor(boid.x / this.cellSize);
            const row = Math.floor(boid.y / this.cellSize);
            const neighbors = [];

            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                        const cell = this.cells[r * this.cols + c];
                        for (let i = 0; i < cell.length; i++) {
                            neighbors.push(cell[i]);
                        }
                    } else if (simulationParameters.wrapAround) {
                        // Handle wrap-around for grid queries
                        let wrappedR = r;
                        let wrappedC = c;

                        if (r < 0) wrappedR = this.rows - 1;
                        else if (r >= this.rows) wrappedR = 0;

                        if (c < 0) wrappedC = this.cols - 1;
                        else if (c >= this.cols) wrappedC = 0;

                        const cell = this.cells[wrappedR * this.cols + wrappedC];
                        for (let i = 0; i < cell.length; i++) {
                            neighbors.push(cell[i]);
                        }
                    }
                }
            }
            return neighbors;
        }
    }

    // Initialize grid with cell size slightly larger than max perception radius
    const grid = new SpatialGrid(window.innerWidth, window.innerHeight, 100);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        grid.resize(canvas.width, canvas.height);
    }

    let resizeQueued = false;
    window.addEventListener('resize', () => {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => {
            resizeQueued = false;
            resizeCanvas();
        });
    });
    resizeCanvas();

    class Boid {
        constructor(x, y, vx, vy) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.nearestNeighborDistance = Infinity;
        }

        draw(baseFont, selectedFont) {
            const emoji = ">";
            const size = simulationParameters.boidSize;
            let boidFillStyle = defaultBoidColor;

            // Handle proximity coloring
            if (proximityColoringEnabled) {
                const maxDistance = simulationParameters.perceptionRadius; // Use perception radius as max distance
                boidFillStyle = getProximityColor(this.nearestNeighborDistance, maxDistance, proximityColorCloseRgb, proximityColorFarRgb);
            }

            // Override with selected boid color if this is the selected boid
            if (this === youAreHereBoid) {
                boidFillStyle = selectedBoidColor;
            }

            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            ctx.font = this === youAreHereBoid ? selectedFont : baseFont;
            ctx.fillStyle = boidFillStyle;
            ctx.fillText(emoji, -size, size);
            ctx.restore();
        }

        updateManualControl() {
            const controlForce = 0.3; // How responsive the manual control is

            // Apply keyboard input as forces
            if (keyboardInput.up) this.vy -= controlForce;
            if (keyboardInput.down) this.vy += controlForce;
            if (keyboardInput.left) this.vx -= controlForce;
            if (keyboardInput.right) this.vx += controlForce;

            // Limit speed
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > simulationParameters.maxSpeed * 1.5) { // Allow slightly higher speed for manual control
                this.vx = (this.vx / speed) * simulationParameters.maxSpeed * 1.5;
                this.vy = (this.vy / speed) * simulationParameters.maxSpeed * 1.5;
            }

            // Add some drag to make control feel more natural
            this.vx *= 0.98;
            this.vy *= 0.98;

            // Update position
            this.x += this.vx;
            this.y += this.vy;

            // Handle boundaries (wrap around)
            if (this.x < -simulationParameters.boidSize) this.x = canvas.width + simulationParameters.boidSize;
            if (this.x > canvas.width + simulationParameters.boidSize) this.x = -simulationParameters.boidSize;
            if (this.y < -simulationParameters.boidSize) this.y = canvas.height + simulationParameters.boidSize;
            if (this.y > canvas.height + simulationParameters.boidSize) this.y = -simulationParameters.boidSize;
        }

        update(boids) {
            // Check if this boid is being manually controlled
            if (this === youAreHereBoid && manualControlEnabled) {
                this.nearestNeighborDistance = Infinity;
                this.updateManualControl();
                return;
            }

            let alignment = { x: 0, y: 0 };
            let cohesion = { x: 0, y: 0 };
            let separation = { x: 0, y: 0 };
            let avoidance = { x: 0, y: 0 };
            let count = 0;
            let nearestNeighborDistance = Infinity;

            // Keep boids within the boundary
            if (this.x < simulationParameters.boundary) this.vx += simulationParameters.maxForce * 2;
            if (this.x > canvas.width - simulationParameters.boundary) this.vx -= simulationParameters.maxForce * 2;
            if (this.y < simulationParameters.boundary) this.vy += simulationParameters.maxForce * 2;
            if (this.y > canvas.height - simulationParameters.boundary) this.vy -= simulationParameters.maxForce * 2;

            const neighbors = grid.getPotentialNeighbors(this);

            for (const other of neighbors) {
                if (other !== this) {
                    let dx = this.x - other.x;
                    let dy = this.y - other.y;

                    // Handle wrap-around for distance calculation
                    if (simulationParameters.wrapAround) {
                        if (Math.abs(dx) > canvas.width / 2) dx = dx > 0 ? dx - canvas.width : dx + canvas.width;
                        if (Math.abs(dy) > canvas.height / 2) dy = dy > 0 ? dy - canvas.height : dy + canvas.height;
                    }

                    const d = Math.hypot(dx, dy);
                    if (d < nearestNeighborDistance) nearestNeighborDistance = d;

                    if (d < simulationParameters.perceptionRadius) {
                        alignment.x += other.vx;
                        alignment.y += other.vy;

                        // For cohesion, we want the position relative to us, handling wrap-around
                        cohesion.x += other.x; // This needs careful handling with wrap-around, but simple average is often "good enough" for visual boids. 
                        // Better approach for cohesion with wrap-around is to average the relative offsets and add to current pos.
                        // Let's stick to simple relative vector for cohesion force:
                        // Cohesion is steering towards average position of neighbors.
                        // Average position = (sum of positions) / count.
                        // Vector to average = Average position - my position.

                        // Let's accumulate the relative position instead to handle wrap-around correctly
                        // cohesion accumulator will store sum of (other.position) - but we need to adjust other.position for wrap around relative to this.
                        let otherX = other.x;
                        let otherY = other.y;
                        if (simulationParameters.wrapAround) {
                            if (otherX - this.x > canvas.width / 2) otherX -= canvas.width;
                            else if (this.x - otherX > canvas.width / 2) otherX += canvas.width;

                            if (otherY - this.y > canvas.height / 2) otherY -= canvas.height;
                            else if (this.y - otherY > canvas.height / 2) otherY += canvas.height;
                        }

                        cohesion.x += otherX;
                        cohesion.y += otherY;

                        if (d < simulationParameters.avoidanceRadius) {
                            const forceMultiplier = (simulationParameters.avoidanceRadius - d) / simulationParameters.avoidanceRadius;
                            // avoidance vector is vector AWAY from neighbor: this.pos - other.pos
                            // We already calculated dx = this.x - other.x (adjusted for wrap)
                            avoidance.x += dx * forceMultiplier;
                            avoidance.y += dy * forceMultiplier;
                        }

                        count++;
                    }
                }
            }

            if (count > 0) {
                // Calculate average alignment, cohesion, and separation vectors
                alignment.x /= count;
                alignment.y /= count;
                cohesion.x = (cohesion.x / count) - this.x;
                cohesion.y = (cohesion.y / count) - this.y;
                separation.x = avoidance.x;
                separation.y = avoidance.y;

                const alignmentMag = Math.hypot(alignment.x, alignment.y);
                const cohesionMag = Math.hypot(cohesion.x, cohesion.y);
                const separationMag = Math.hypot(separation.x, separation.y);
                const avoidanceMag = Math.hypot(avoidance.x, avoidance.y);

                // Normalize and scale vectors
                if (alignmentMag !== 0) {
                    alignment.x = (alignment.x / alignmentMag) * simulationParameters.maxSpeed;
                    alignment.y = (alignment.y / alignmentMag) * simulationParameters.maxSpeed;
                }

                if (cohesionMag !== 0) {
                    cohesion.x = (cohesion.x / cohesionMag) * simulationParameters.maxSpeed;
                    cohesion.y = (cohesion.y / cohesionMag) * simulationParameters.maxSpeed;
                }

                if (separationMag !== 0) {
                    separation.x = (separation.x / separationMag) * simulationParameters.maxSpeed;
                    separation.y = (separation.y / separationMag) * simulationParameters.maxSpeed;
                }

                if (avoidanceMag !== 0) {
                    avoidance.x = (avoidance.x / avoidanceMag) * simulationParameters.maxSpeed;
                    avoidance.y = (avoidance.y / avoidanceMag) * simulationParameters.maxSpeed;
                }

                // Apply weights to the vectors
                alignment.x *= simulationParameters.alignmentWeight;
                alignment.y *= simulationParameters.alignmentWeight;
                cohesion.x *= simulationParameters.cohesionWeight;
                cohesion.y *= simulationParameters.cohesionWeight;
                separation.x *= simulationParameters.separationWeight;
                separation.y *= simulationParameters.separationWeight;
                avoidance.x *= simulationParameters.avoidanceWeight;
                avoidance.y *= simulationParameters.avoidanceWeight;

                // Calculate acceleration
                const ax = alignment.x + cohesion.x + separation.x + avoidance.x;
                const ay = alignment.y + cohesion.y + separation.y + avoidance.y;

                // Apply acceleration
                this.vx += ax * simulationParameters.maxForce;
                this.vy += ay * simulationParameters.maxForce;

                // Limit speed
                const speed = Math.hypot(this.vx, this.vy);
                if (speed > simulationParameters.maxSpeed) {
                    this.vx = (this.vx / speed) * simulationParameters.maxSpeed;
                    this.vy = (this.vy / speed) * simulationParameters.maxSpeed;
                }
            }
            this.nearestNeighborDistance = nearestNeighborDistance;

            // Update position
            this.x += this.vx;
            this.y += this.vy;

            if (!simulationParameters.wrapAround) {
                if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
            } else {
                if (this.x < -simulationParameters.boidSize) this.x = canvas.width + simulationParameters.boidSize;
                if (this.x > canvas.width + simulationParameters.boidSize) this.x = -simulationParameters.boidSize;
                if (this.y < -simulationParameters.boidSize) this.y = canvas.height + simulationParameters.boidSize;
                if (this.y > canvas.height + simulationParameters.boidSize) this.y = -simulationParameters.boidSize;
            }
        }
    }

    const simulationParameters = {
        numBoids: 200,
        boidSize: 14,
        maxSpeed: 3.0,
        maxForce: 0.1,
        perceptionRadius: 70,
        avoidanceRadius: 30,
        alignmentWeight: 4.5,
        cohesionWeight: .1,
        separationWeight: 1.8,
        avoidanceWeight: 1.0,
        boundary: 0,
        wrapAround: true,
    };

    // Make simulationParameters available globally
    window.simulationParameters = simulationParameters;

    const boids = [];
    window.boids = boids; // Make boids array accessible globally for the button

    function initBoids() {
        boids.length = 0;
        for (let i = 0; i < simulationParameters.numBoids; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const vx = (Math.random() * 2 - 1) * simulationParameters.maxSpeed;
            const vy = (Math.random() * 2 - 1) * simulationParameters.maxSpeed;
            boids.push(new Boid(x, y, vx, vy));
        }
    }

    // Make initBoids available globally
    window.initBoids = initBoids;

    const targetFps = 45;
    const frameInterval = 1000 / targetFps;
    let lastFrameTime = 0;

    function animate(timestamp = 0) {
        if (timestamp - lastFrameTime < frameInterval) {
            requestAnimationFrame(animate);
            return;
        }
        lastFrameTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update grid
        grid.clear();
        for (const boid of boids) {
            grid.add(boid);
        }

        for (const boid of boids) {
            boid.update(grid);
        }

        const fontSize = simulationParameters.boidSize * 4;
        const baseFont = `${fontSize}px ${boidFontFamily}`;
        const selectedFont = `bold ${fontSize}px ${boidFontFamily}`;
        for (const boid of boids) {
            boid.draw(baseFont, selectedFont);
        }

        requestAnimationFrame(animate);
    }

    initBoids();
    animate();

    // Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const potteryImages = document.querySelectorAll('.pottery-image img');

    potteryImages.forEach(img => {
        img.addEventListener('click', () => {
            // Get the highest resolution image from srcset
            const srcset = img.getAttribute('srcset');
            let highResSrc = img.src; // Fallback

            if (srcset) {
                // Parse srcset to find the largest image
                // Format: "url size, url size, ..."
                const sources = srcset.split(',').map(src => {
                    const parts = src.trim().split(' ');
                    return {
                        url: parts[0],
                        width: parseInt(parts[1])
                    };
                });

                // Sort by width descending and pick the first one
                sources.sort((a, b) => b.width - a.width);
                if (sources.length > 0) {
                    highResSrc = sources[0].url;
                }
            }

            lightboxImg.src = highResSrc;
            lightbox.classList.add('show');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            lightboxClose.focus();
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('show');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore scrolling
        setTimeout(() => {
            lightboxImg.src = '';
        }, 300);
    }

    lightboxClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('show')) {
            closeLightbox();
        }
    });

    // Parameter controls
    const controls = [
        'numBoids', 'boidSize', 'maxSpeed', 'maxForce', 'perceptionRadius', 'avoidanceRadius',
        'cohesionWeight', 'separationWeight', 'alignmentWeight', 'avoidanceWeight'
    ];

    controls.forEach(control => {
        const element = document.getElementById(control);
        const valueElement = document.getElementById(control + 'Value');

        if (element && valueElement) {
            // Set initial value display from simulationParameters
            valueElement.textContent = simulationParameters[control];
            element.value = simulationParameters[control];

            element.addEventListener('input', (event) => {
                let value;
                if (control === 'numBoids' || control === 'perceptionRadius' || control === 'avoidanceRadius' || control === 'boidSize') {
                    value = parseInt(event.target.value, 10);
                } else {
                    value = parseFloat(event.target.value);
                }

                valueElement.textContent = value;

                if (!isNaN(value)) {
                    simulationParameters[control] = value;
                    if (control === 'numBoids') {
                        initBoids();
                    }

                    // Easter egg: Show hidden control when self control is at maximum (5)
                    if (control === 'avoidanceWeight') {
                        const hiddenControl = document.getElementById('hiddenControl');
                        if (hiddenControl) {
                            if (value === 5) {
                                hiddenControl.style.display = 'block';
                            } else {
                                hiddenControl.style.display = 'none';
                                // Also disable manual control if it was enabled
                                if (manualControlEnabled) {
                                    manualControlEnabled = false;
                                    const manualControlButton = document.getElementById('manualControlButton');
                                    if (manualControlButton) {
                                        manualControlButton.textContent = 'Take Control';
                                        manualControlButton.style.backgroundColor = 'rgba(89, 95, 87, 0.6)';
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
    });

    // Toggle menu
    const toggleButton = document.getElementById('toggle-menu-button');
    const menu = document.getElementById('parameter-menu');

    if (toggleButton && menu) {
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.addEventListener('click', () => {
            const isOpen = menu.classList.toggle('show');
            toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    // Category navigation
    const categoryTabs = document.querySelectorAll('.category-tab');
    const parameterCategories = document.querySelectorAll('.parameter-category');

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetCategory = tab.getAttribute('data-category');

            // Remove active class from all tabs and categories
            categoryTabs.forEach(t => t.classList.remove('active'));
            parameterCategories.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding category
            tab.classList.add('active');
            const targetCategoryElement = document.querySelector(`.parameter-category[data-category="${targetCategory}"]`);
            if (targetCategoryElement) {
                targetCategoryElement.classList.add('active');
            }
        });
    });
} 
