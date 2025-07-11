let youAreHereBoid = null;
let manualControlEnabled = false;
let keyboardInput = { up: false, down: false, left: false, right: false };
let proximityColoringEnabled = false;
let proximityColorClose = '#ff6b6b'; // Color for boids close to neighbors
let proximityColorFar = '#4ecdc4'; // Color for boids far from neighbors
const selectedBoidColor = 'rgba(0, 123, 255, 1)'; // Deep vibrant blue (reverted)
const defaultBoidColor = 'rgba(249, 253, 249, 0.7)'; // Default Off-White for boids

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links a, .cta-button[data-section]');
    const readMoreLinks = document.querySelectorAll('.read-more[data-article]');
    const sections = document.querySelectorAll('.section');
    const articleSections = document.querySelectorAll('.article-section');
    const canvas = document.getElementById('flocking-canvas');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinksContainer = document.querySelector('.nav-links');
    const backButton = document.getElementById('back-button');

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', function() {
        navLinksContainer.classList.toggle('show');
    });

    function showSection(targetSection) {
        // Hide all sections and articles
        sections.forEach(section => {
            section.classList.remove('active');
        });
        articleSections.forEach(article => {
            article.classList.remove('active');
        });

        // Show target section
        const target = document.getElementById(targetSection);
        if (target) {
            target.classList.add('active');
        }

        // Scroll the main container to the top so content is visible immediately
        document.querySelector('main').scrollTo({ top: 0, left: 0, behavior: 'auto' });

        // Update active nav link
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        const activeNavLink = document.querySelector(`.nav-links a[data-section="${targetSection}"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }

        // Adjust simulation opacity
        if (targetSection === 'home') {
            canvas.style.opacity = '0.9'; // Homepage opacity
        } else {
            canvas.style.opacity = '0.2'; // Subtle opacity for all other sections
        }

        // Hide back button
        backButton.classList.remove('show');
        document.body.classList.remove('article-page');

        // Close mobile menu
        navLinksContainer.classList.remove('show');
    }

    function showArticle(articleId) {
        // Hide all sections and articles
        sections.forEach(section => {
            section.classList.remove('active');
        });
        articleSections.forEach(article => {
            article.classList.remove('active');
        });

        // Show target article
        const target = document.getElementById(articleId);
        if (target) {
            target.classList.add('active');
        }

        // Scroll the main container to the top so article content is visible immediately
        document.querySelector('main').scrollTo({ top: 0, left: 0, behavior: 'auto' });

        // Clear active nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Set very slow simulation for articles
        canvas.style.opacity = '0.1';
        document.body.classList.add('article-page');
        
        // Show back button
        backButton.classList.add('show');

        // Close mobile menu
        navLinksContainer.classList.remove('show');
    }

    // Add click listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            if (targetSection) {
                showSection(targetSection);
            }
        });
    });

    // Add click listeners to read more links
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const articleId = this.getAttribute('data-article');
            if (articleId) {
                showArticle(articleId);
            }
        });
    });

    // Back button functionality
    backButton.addEventListener('click', function(e) {
        e.preventDefault();
        showSection('blog');
    });

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
    
    if (proximityColorToggle) {
        proximityColorToggle.addEventListener('change', (e) => {
            proximityColoringEnabled = e.target.checked;
        });
    }
    
    if (proximityColorPickerClose) {
        proximityColorPickerClose.addEventListener('input', (e) => {
            proximityColorClose = e.target.value;
        });
    }
    
    if (proximityColorPickerFar) {
        proximityColorPickerFar.addEventListener('input', (e) => {
            proximityColorFar = e.target.value;
        });
    }

    // Keyboard event listeners for manual control
    document.addEventListener('keydown', (e) => {
        if (!manualControlEnabled || !youAreHereBoid) return;
        
        switch(e.key) {
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
        
        switch(e.key) {
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

    // Smooth scroll for nav links
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                // Optionally update active nav link (if needed)
                updateActiveNavLink(targetId);
                // Close mobile menu if open
                if (navLinksContainer.classList.contains('show')) {
                    navLinksContainer.classList.remove('show');
                }
            }
        });
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
    const closeRgb = hexToRgb(closeColor);
    const farRgb = hexToRgb(farColor);
    
    if (!closeRgb || !farRgb) return defaultBoidColor;
    
    // Normalize distance (0 = very close, 1 = far away)
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    
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

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Boid {
        constructor(x, y, vx, vy) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
        }

        findNearestNeighborDistance(boids) {
            let minDistance = Infinity;
            for (const other of boids) {
                if (other !== this) {
                    const distance = Math.hypot(this.x - other.x, this.y - other.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }
            return minDistance;
        }

        draw(boids) {
            const emoji = ">";
            const size = simulationParameters.boidSize;
            let boidFillStyle = defaultBoidColor;
            let fontWeight = ''; // Default no specific weight

            // Handle proximity coloring
            if (proximityColoringEnabled && boids) {
                const nearestDistance = this.findNearestNeighborDistance(boids);
                const maxDistance = simulationParameters.perceptionRadius; // Use perception radius as max distance
                boidFillStyle = getProximityColor(nearestDistance, maxDistance, proximityColorClose, proximityColorFar);
            }

            // Override with selected boid color if this is the selected boid
            if (this === youAreHereBoid) {
                boidFillStyle = selectedBoidColor;
                fontWeight = 'bold '; // Add bold prefix for selected boid
            }

            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            ctx.font = `${fontWeight}${size * 4}px ${boidFontFamily}`; /* Use computed font family and conditional bolding */
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
                this.updateManualControl();
                return;
            }

            let alignment = { x: 0, y: 0 };
            let cohesion = { x: 0, y: 0 };
            let separation = { x: 0, y: 0 };
            let avoidance = { x: 0, y: 0 };
            let count = 0;

            // Keep boids within the boundary
            if (this.x < simulationParameters.boundary) this.vx += simulationParameters.maxForce * 2;
            if (this.x > canvas.width - simulationParameters.boundary) this.vx -= simulationParameters.maxForce * 2;
            if (this.y < simulationParameters.boundary) this.vy += simulationParameters.maxForce * 2;
            if (this.y > canvas.height - simulationParameters.boundary) this.vy -= simulationParameters.maxForce * 2;

            for (const other of boids) {
                if (other !== this) {
                    const d = Math.hypot(this.x - other.x, this.y - other.y);

                    if (d < simulationParameters.perceptionRadius) {
                        alignment.x += other.vx;
                        alignment.y += other.vy;
                        cohesion.x += other.x;
                        cohesion.y += other.y;

                        if (d < simulationParameters.avoidanceRadius) {
                            const forceMultiplier = (simulationParameters.avoidanceRadius - d) / simulationParameters.avoidanceRadius;
                            avoidance.x += (this.x - other.x) * forceMultiplier;
                            avoidance.y += (this.y - other.y) * forceMultiplier;
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
        maxSpeed: 1.3,
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

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const boid of boids) {
            boid.update(boids);
        }

        for (const boid of boids) {
            boid.draw(boids);
        }

        requestAnimationFrame(animate);
    }

    initBoids();
    animate();

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
        toggleButton.addEventListener('click', () => {
            menu.classList.toggle('show');
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