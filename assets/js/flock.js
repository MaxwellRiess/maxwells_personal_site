/* Shared by the static site and the Node regression tests. */
(function (root) {
    'use strict';
    const defaults = Object.freeze({ numBoids: 200, boidSize: 14, maxSpeed: 3,
        maxForce: 0.1, perceptionRadius: 70, avoidanceRadius: 30, alignmentRadius: 35,
        visionAngle: 270, wander: 0.08,
        alignmentWeight: 4.5, cohesionWeight: 0.1, separationWeight: 1.8 });
    const wrap = (x, size) => ((x % size) + size) % size;
    const offset = (x, size) => x > size / 2 ? x - size : x < -size / 2 ? x + size : x;
    function limit(x, y, maximum) {
        const magnitude = Math.hypot(x, y);
        const scale = magnitude > maximum ? maximum / magnitude : 1;
        return { x: x * scale, y: y * scale };
    }
    function randomSeed(seed) {
        return () => {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    class SpatialGrid {
        constructor(width, height) { this.resize(width, height); }
        resize(width, height) {
            this.width = width; this.height = height;
            this.cols = Math.max(1, Math.ceil(width / 100));
            this.rows = Math.max(1, Math.ceil(height / 100));
            // Equal cells tile the entire torus, including non-multiple viewport sizes.
            this.cellWidth = width / this.cols; this.cellHeight = height / this.rows;
            this.cells = Array.from({ length: this.cols * this.rows }, () => []);
        }
        clear() { this.cells.forEach(cell => { cell.length = 0; }); }
        add(boid) {
            const col = Math.floor(wrap(boid.x, this.width) / this.cellWidth);
            const row = Math.floor(wrap(boid.y, this.height) / this.cellHeight);
            this.cells[row * this.cols + col].push(boid);
        }
        neighbors(boid, radius) {
            const col = Math.floor(wrap(boid.x, this.width) / this.cellWidth);
            const row = Math.floor(wrap(boid.y, this.height) / this.cellHeight);
            const rx = Math.min(this.cols, Math.ceil(radius / this.cellWidth));
            const ry = Math.min(this.rows, Math.ceil(radius / this.cellHeight));
            const visited = new Set(); const result = [];
            for (let y = row - ry; y <= row + ry; y++) {
                for (let x = col - rx; x <= col + rx; x++) {
                    const index = wrap(y, this.rows) * this.cols + wrap(x, this.cols);
                    if (!visited.has(index)) { visited.add(index); result.push(...this.cells[index]); }
                }
            }
            return result;
        }
    }
    class Simulation {
        constructor(width, height, parameters = {}, seed = 1) {
            this.width = Math.max(1, width); this.height = Math.max(1, height);
            this.parameters = { ...defaults, ...parameters }; this.seed = seed;
            this.grid = new SpatialGrid(this.width, this.height);
            this.boids = []; this.reset();
        }
        reset(seed = this.seed) {
            this.seed = seed; this.time = 0; const random = randomSeed(seed);
            this.boids.length = 0;
            for (let id = 0; id < this.parameters.numBoids; id++) {
                const angle = random() * Math.PI * 2;
                const speed = this.parameters.maxSpeed * (0.7 + 0.3 * random());
                this.boids.push({ id, x: random() * this.width, y: random() * this.height,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    nearestNeighborDistance: Infinity });
            }
        }
        resize(width, height) {
            width = Math.max(1, width); height = Math.max(1, height);
            this.boids.forEach(b => { b.x = wrap(b.x * width / this.width, width); b.y = wrap(b.y * height / this.height, height); });
            this.width = width; this.height = height; this.grid.resize(width, height);
        }
        capSpeeds(controlledId = null) {
            this.boids.forEach(b => { const v = limit(b.vx, b.vy, this.parameters.maxSpeed * (b.id === controlledId ? 1.5 : 1)); b.vx = v.x; b.vy = v.y; });
        }
        direction(boid) {
            const p = this.parameters;
            const speed = Math.hypot(boid.vx, boid.vy);
            const hx = speed > 1e-8 ? boid.vx / speed : 1;
            const hy = speed > 1e-8 ? boid.vy / speed : 0;
            const view = Math.cos(p.visionAngle * Math.PI / 360);
            let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, nearest = Infinity;
            for (const other of this.grid.neighbors(boid, Math.max(p.perceptionRadius, p.avoidanceRadius))) {
                if (other.id === boid.id) continue;
                const dx = offset(other.x - boid.x, this.width), dy = offset(other.y - boid.y, this.height);
                const d = Math.hypot(dx, dy); nearest = Math.min(nearest, d);
                // Repulsion is omnidirectional and independent of social perception.
                if (d < p.avoidanceRadius) {
                    if (d < 1e-8) sx += boid.id < other.id ? -1 : 1;
                    else { sx -= dx / d; sy -= dy / d; }
                    continue;
                }
                if (d >= p.perceptionRadius || (dx * hx + dy * hy) / d < view) continue;
                // Separate middle (alignment) and outer (attraction) zones.
                if (d < p.alignmentRadius) {
                    const otherSpeed = Math.hypot(other.vx, other.vy);
                    if (otherSpeed > 1e-8) { ax += other.vx / otherSpeed; ay += other.vy / otherSpeed; }
                } else { cx += dx / d; cy += dy / d; }
            }
            boid.nearestNeighborDistance = nearest;
            const unit = (x, y) => { const length = Math.hypot(x, y); return length > 1e-8 ? { x: x / length, y: y / length } : { x: 0, y: 0 }; };
            const repel = unit(sx, sy), align = unit(ax, ay), attract = unit(cx, cy);
            // Nearby collisions take precedence over all social steering.
            const urgency = nearest < p.avoidanceRadius ? Math.min(1, p.separationWeight) : 0;
            let x = (1 - urgency) * (align.x * p.alignmentWeight + attract.x * p.cohesionWeight) + repel.x * p.separationWeight;
            let y = (1 - urgency) * (align.y * p.alignmentWeight + attract.y * p.cohesionWeight) + repel.y * p.separationWeight;
            if (Math.hypot(x, y) < 1e-8) { x = hx; y = hy; }
            // Smooth individual angular variation; no global centre, orbit or clockwise bias.
            const phase = (boid.id * 2.3999632297 + this.seed * 0.6180339887) % (2 * Math.PI);
            const noise = p.wander * 0.5 * (Math.sin(this.time * 1.7 + phase) + Math.sin(this.time * 0.73 + phase * 2.3));
            return Math.atan2(y, x) + noise;
        }
        acceleration(boid) {
            const angle = this.direction(boid), p = this.parameters;
            return limit(Math.cos(angle) * p.maxSpeed - boid.vx, Math.sin(angle) * p.maxSpeed - boid.vy, p.maxForce);
        }
        step(dt = 1 / 60, controlledId = null, input = {}) {
            const scale = dt * 30;
            this.grid.clear(); this.boids.forEach(b => this.grid.add(b));
            // Every bird reads the same snapshot before any positions or velocities change.
            const headings = this.boids.map(b => b.id === controlledId ? null : this.direction(b));
            this.boids.forEach((b, i) => {
                if (b.id === controlledId) {
                    // Original direct thrust and drag, with extra speed and agility.
                    const thrust = Math.max(0.3, this.parameters.maxForce * 3);
                    const velocity = limit(b.vx + (Number(!!input.right) - Number(!!input.left)) * thrust * scale,
                        b.vy + (Number(!!input.down) - Number(!!input.up)) * thrust * scale, this.parameters.maxSpeed * 1.5);
                    const drag = Math.pow(0.98, scale);
                    b.vx = velocity.x * drag; b.vy = velocity.y * drag;
                } else {
                    const heading = Math.atan2(b.vy, b.vx);
                    const difference = Math.atan2(Math.sin(headings[i] - heading), Math.cos(headings[i] - heading));
                    // Constant cruising speed and bounded turning allow persistent mills.
                    const speed = this.parameters.maxSpeed;
                    const turn = this.parameters.maxForce / Math.max(speed, 0.1) * scale;
                    const angle = heading + Math.max(-turn, Math.min(turn, difference));
                    b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
                }
                b.x = wrap(b.x + b.vx * scale, this.width); b.y = wrap(b.y + b.vy * scale, this.height);
            });
            this.time += dt;
        }
    }
    class FixedClock {
        constructor() { this.reset(); }
        reset() { this.last = null; this.accumulator = 0; }
        advance(timestamp, step) {
            if (this.last === null) { this.last = timestamp; return; }
            this.accumulator += Math.min(Math.max(0, timestamp - this.last), 100) / 1000;
            this.last = timestamp;
            while (this.accumulator + 1e-10 >= 1 / 60) { step(1 / 60); this.accumulator -= 1 / 60; }
        }
    }
    const api = { defaults, Simulation, SpatialGrid, FixedClock };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Flock = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
