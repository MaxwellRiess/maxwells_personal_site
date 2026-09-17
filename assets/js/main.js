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
        mobileMenuBtn.setAttribute('aria-label', 'Open navigation menu');
    }

    function updateLogoState(targetSection) {
        if (!logoWordmark) return;
        logoWordmark.classList.toggle('is-condensed', targetSection !== 'home');
    }

    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function () {
            const isOpen = navLinksContainer.classList.toggle('show');
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
            mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        });
    }

    syncWordmarkMetrics();
    queueWordmarkMetricsSync();
    window.addEventListener('resize', queueWordmarkMetricsSync);
    if (document.fonts?.ready) {
        document.fonts.ready.then(queueWordmarkMetricsSync);
    }

    const sectionIds = new Set(Array.from(sections, section => section.id));
    function showSection(id, focus = false) {
        if (!sectionIds.has(id)) id = 'home';
        const target = document.getElementById(id);
        sections.forEach(section => section.classList.toggle('active', section === target));
        navLinks.forEach(link => {
            const active = link.dataset.section === id;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        closeMobileMenu();
        updateLogoState(id);
        canvas.style.opacity = id === 'home' ? '0.9' : '0.2';
        if (focus) {
            const heading = target.querySelector('h1, h2') || target;
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        }
        // Desktop scrolls main; mobile CSS also makes body a scroll container.
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.dispatchEvent(new Event('sectionchange'));
    }
    function readLocation(focus = false) {
        const id = location.hash.slice(1);
        if (!sectionIds.has(id)) history.replaceState(null, '', '#home');
        showSection(sectionIds.has(id) ? id : 'home', focus);
    }
    history.scrollRestoration = 'manual';
    navLinks.forEach(link => link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const id = link.dataset.section;
        if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
        showSection(id, true);
    }));
    window.addEventListener('popstate', () => readLocation(true));
    window.addEventListener('hashchange', () => readLocation(true));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navLinksContainer.classList.contains('show')) {
            closeMobileMenu(); mobileMenuBtn.focus();
        }
    });
    readLocation();
    initFlockingSimulation();
    initLightbox();
});

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

function initFlockingSimulation() {
    const canvas = document.getElementById('flocking-canvas');
    const ctx = canvas.getContext('2d');
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font-heading').trim();
    const simulation = new Flock.Simulation(innerWidth, innerHeight, {}, Math.floor(Math.random() * 4294967295));
    const parameters = simulation.parameters;
    const clock = new Flock.FixedClock();
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const pauseButton = document.getElementById('pause-simulation');
    const manualButton = document.getElementById('manualControlButton');
    const status = document.getElementById('simulation-status');
    const hiddenControl = document.getElementById('hiddenControl');
    const selfControl = document.getElementById('selfControl');
    const controls = Object.keys(Flock.defaults).filter(key => document.getElementById(key));
    let paused = motionPreference.matches;
    let frame = null;
    let dialogOpen = false;
    // Retain the existing inspection hooks for experimenting in developer tools.
    window.simulationParameters = parameters;
    window.boids = simulation.boids;

    function clearInput() { keyboardInput = { up: false, down: false, left: false, right: false }; }
    function releaseControl() {
        manualControlEnabled = false; clearInput();
        manualButton.textContent = 'Take Control'; manualButton.setAttribute('aria-pressed', 'false');
        simulation.capSpeeds();
    }
    function draw() {
        ctx.clearRect(0, 0, simulation.width, simulation.height);
        const size = parameters.boidSize;
        for (const boid of simulation.boids) {
            const selected = boid === youAreHereBoid;
            const color = selected ? selectedBoidColor : proximityColoringEnabled ?
                getProximityColor(boid.nearestNeighborDistance, parameters.perceptionRadius, proximityColorCloseRgb, proximityColorFarRgb) : defaultBoidColor;
            // Render copies at the edges without moving physics positions outside the torus.
            const xs = [boid.x], ys = [boid.y];
            const margin = size * 4;
            if (boid.x < margin) xs.push(boid.x + simulation.width);
            if (boid.x > simulation.width - margin) xs.push(boid.x - simulation.width);
            if (boid.y < margin) ys.push(boid.y + simulation.height);
            if (boid.y > simulation.height - margin) ys.push(boid.y - simulation.height);
            for (const x of xs) for (const y of ys) {
                ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(boid.vy, boid.vx));
                ctx.font = `${selected ? 'bold ' : ''}${size * 4}px ${font}`;
                ctx.fillStyle = color; ctx.fillText('>', -size, size); ctx.restore();
            }
        }
    }
    function running() { return !paused && !document.hidden && !dialogOpen; }
    function animate(timestamp) {
        frame = null;
        if (!running()) return;
        clock.advance(timestamp, dt => simulation.step(dt, manualControlEnabled ? youAreHereBoid?.id : null, keyboardInput));
        draw(); frame = requestAnimationFrame(animate);
    }
    function syncAnimation() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; clock.reset(); clearInput();
        pauseButton.textContent = paused ? 'Resume' : 'Pause';
        pauseButton.setAttribute('aria-label', paused ? 'Resume flock animation' : 'Pause flock animation');
        status.textContent = paused ? (motionPreference.matches ? 'Paused. Reduced motion is enabled.' : 'Animation paused.') : 'Animation running.';
        draw();
        if (running()) frame = requestAnimationFrame(animate);
    }
    function resize() {
        simulation.resize(innerWidth, innerHeight);
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(innerWidth * ratio); canvas.height = Math.round(innerHeight * ratio);
        canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', syncAnimation);
    document.addEventListener('sectionchange', () => { releaseControl(); });
    document.addEventListener('lightboxchange', event => { dialogOpen = event.detail.open; syncAnimation(); });
    motionPreference.addEventListener('change', event => {
        // A new request for less motion takes effect immediately. Resuming is explicit.
        if (event.matches) { paused = true; releaseControl(); }
        syncAnimation();
    });
    pauseButton.addEventListener('click', () => { paused = !paused; syncAnimation(); });
    function reset() {
        releaseControl(); youAreHereBoid = null;
        simulation.reset(Math.floor(Math.random() * 4294967295)); syncAnimation();
    }
    window.initBoids = reset;
    function syncControls() {
        for (const key of controls) {
            document.getElementById(key).value = parameters[key];
            document.getElementById(key + 'Value').textContent = parameters[key];
        }
    }
    for (const key of controls) {
        document.getElementById(key).addEventListener('input', event => {
            parameters[key] = Number(event.target.value);
            document.getElementById(key + 'Value').textContent = parameters[key];
            simulation.capSpeeds(manualControlEnabled ? youAreHereBoid?.id : null);
            if (key === 'numBoids') reset(); else draw();
        });
    }
    document.getElementById('youAreHereButton').addEventListener('click', () => {
        youAreHereBoid = simulation.boids[Math.floor(Math.random() * simulation.boids.length)];
        simulation.capSpeeds(manualControlEnabled ? youAreHereBoid.id : null);
        draw();
    });
    // This deliberately playful control only unlocks manual flight; it does not
    // duplicate separation or alter the flock's local interaction rules.
    selfControl.addEventListener('input', () => {
        const value = Number(selfControl.value);
        document.getElementById('selfControlValue').textContent = value;
        hiddenControl.hidden = value !== Number(selfControl.max);
        if (hiddenControl.hidden) releaseControl();
        draw();
    });
    manualButton.addEventListener('click', () => {
        if (manualControlEnabled) releaseControl();
        else {
            if (hiddenControl.hidden) return;
            youAreHereBoid ||= simulation.boids[0]; manualControlEnabled = true;
            manualButton.textContent = 'Release Control'; manualButton.setAttribute('aria-pressed', 'true');
        }
        draw();
    });
    const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    document.addEventListener('keydown', event => {
        if (!manualControlEnabled || !running() || !keys[event.key]) return;
        // Sliders, form fields and tab navigation retain their arrow-key controls.
        if (event.target.closest('input, select, textarea, [role="tab"], [contenteditable="true"]')) return;
        keyboardInput[keys[event.key]] = true; event.preventDefault();
    });
    document.addEventListener('keyup', event => { if (keys[event.key]) keyboardInput[keys[event.key]] = false; });
    document.getElementById('proximityColorToggle').addEventListener('change', event => { proximityColoringEnabled = event.target.checked; draw(); });
    document.getElementById('proximityColorPickerClose').addEventListener('input', event => { proximityColorCloseRgb = hexToRgb(event.target.value); draw(); });
    document.getElementById('proximityColorPickerFar').addEventListener('input', event => { proximityColorFarRgb = hexToRgb(event.target.value); draw(); });

    const toggle = document.getElementById('toggle-menu-button');
    const menu = document.getElementById('parameter-menu');
    function closeMenu(returnFocus = false) {
        menu.hidden = true; toggle.classList.remove('panel-open'); toggle.setAttribute('aria-expanded', 'false');
        clearInput(); if (returnFocus) toggle.focus();
    }
    toggle.addEventListener('click', () => {
        const opening = menu.hidden;
        menu.hidden = !opening; menu.classList.toggle('show', opening);
        toggle.classList.toggle('panel-open', opening); toggle.setAttribute('aria-expanded', String(opening));
    });
    menu.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    });
    const tabs = Array.from(document.querySelectorAll('.category-tab'));
    function selectTab(tab, focus = false) {
        tabs.forEach(item => {
            const selected = item === tab;
            item.classList.toggle('active', selected); item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
            const panel = document.getElementById(item.getAttribute('aria-controls'));
            panel.hidden = !selected; panel.classList.toggle('active', selected);
        });
        if (focus) tab.focus();
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
        });
    });
    syncControls(); resize(); syncAnimation();
    document.fonts?.ready.then(draw);
}

function initLightbox() {
    const dialog = document.getElementById('lightbox');
    const image = document.getElementById('lightbox-img');
    const close = document.getElementById('lightbox-close');
    const background = [document.querySelector('nav'), document.querySelector('main'), document.getElementById('simulation-controls')];
    let trigger = null;
    let previousOverflow = '';
    let previousInert = [];
    document.querySelectorAll('.pottery-image img').forEach(thumbnail => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'pottery-open';
        button.setAttribute('aria-label', 'Enlarge ' + thumbnail.alt); button.setAttribute('aria-haspopup', 'dialog');
        thumbnail.replaceWith(button); button.append(thumbnail);
        button.addEventListener('click', () => {
            trigger = button;
            const sources = (thumbnail.getAttribute('srcset') || '').split(',').map(source => source.trim().split(/\s+/)).filter(parts => parts[0]);
            sources.sort((a, b) => parseInt(b[1] || 0, 10) - parseInt(a[1] || 0, 10));
            image.src = sources[0]?.[0] || thumbnail.src; image.alt = thumbnail.alt;
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            previousInert = background.map(element => element.inert);
            background.forEach(element => { element.inert = true; });
            dialog.hidden = false; dialog.classList.add('show'); dialog.setAttribute('aria-hidden', 'false');
            close.focus(); document.dispatchEvent(new CustomEvent('lightboxchange', { detail: { open: true } }));
        });
    });
    function dismiss() {
        if (dialog.hidden) return;
        dialog.hidden = true; dialog.classList.remove('show'); dialog.setAttribute('aria-hidden', 'true');
        image.removeAttribute('src');
        document.body.style.overflow = previousOverflow;
        background.forEach((element, index) => { element.inert = previousInert[index]; });
        trigger?.focus({ preventScroll: true });
        document.dispatchEvent(new CustomEvent('lightboxchange', { detail: { open: false } }));
    }
    close.addEventListener('click', dismiss);
    dialog.addEventListener('click', event => { if (event.target === dialog) dismiss(); });
    dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
        // Close is the only focusable item in this image-only dialog.
        if (event.key === 'Tab') { event.preventDefault(); close.focus(); }
    });
}
