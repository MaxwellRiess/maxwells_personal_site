const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Simulation, SpatialGrid, FixedClock, defaults } = require('../assets/js/flock.js');
function bird(id, x, y, vx = 0, vy = 0) { return { id, x, y, vx, vy }; }
function scene(birds, parameters = {}, width = 1280, height = 720) {
    const sim = new Simulation(width, height, { ...parameters, numBoids: 0 });
    sim.boids.push(...birds); sim.grid.clear(); sim.boids.forEach(b => sim.grid.add(b)); return sim;
}
test('attraction points toward a left neighbour and is translation invariant', () => {
    const parameters = { alignmentWeight: 0, separationWeight: 0, cohesionWeight: 1, visionAngle: 360, wander: 0 };
    const a = scene([bird(0, 600, 400), bird(1, 540, 400)], parameters);
    const b = scene([bird(0, 900, 400), bird(1, 840, 400)], parameters);
    const force = a.acceleration(a.boids[0]); assert.ok(force.x < 0); assert.ok(Math.abs(force.y) < 1e-10);
    assert.deepEqual(force, b.acceleration(b.boids[0]));
});
test('personal space works outside perception', () => {
    const sim = scene([bird(0, 100, 100), bird(1, 120, 100)], { perceptionRadius: 5, avoidanceRadius: 40, alignmentWeight: 0, cohesionWeight: 0 });
    assert.ok(sim.acceleration(sim.boids[0]).x < 0);
});
test('wrapped grid finds neighbours across partial cells and never duplicates birds', () => {
    for (const [width, height] of [[1280, 720], [390, 844], [30, 30], [100, 80]]) {
        const grid = new SpatialGrid(width, height);
        const a = bird(0, 5, 5), b = bird(1, width - 85, 5);
        grid.add(a); grid.add(b); const found = grid.neighbors(a, 100);
        assert.ok(found.includes(b)); assert.equal(found.length, new Set(found).size);
    }
});
test('autonomous steering and speed are capped even when isolated', () => {
    const sim = scene([bird(0, 100, 100, 8, 0)], { maxSpeed: 1 });
    sim.step(); assert.ok(Math.hypot(sim.boids[0].vx, sim.boids[0].vy) <= 1);
    const flock = scene([bird(0, 100, 100), bird(1, 105, 103)], { alignmentWeight: 5, cohesionWeight: 5, separationWeight: 10, maxForce: 0.03 });
    const force = flock.acceleration(flock.boids[0]); assert.ok(Math.hypot(force.x, force.y) <= 0.03 + 1e-12);
});
test('all birds update from the same snapshot', () => {
    const birds = [bird(0, 100, 100, 1, 0), bird(1, 115, 100, 0, 1), bird(2, 140, 108, -1, 0)];
    const a = scene(birds.map(b => ({ ...b }))), b = scene(birds.map(b => ({ ...b })).reverse());
    a.step(); b.step();
    for (const first of a.boids) {
        const second = b.boids.find(bird => bird.id === first.id);
        for (const key of ['x', 'y', 'vx', 'vy']) assert.ok(Math.abs(first[key] - second[key]) < 1e-10);
    }
});
test('seeded resets repeat, initial speeds are bounded, resizing and wrapping retain valid positions', () => {
    const sim = new Simulation(390, 844, {}, 42); const initial = JSON.stringify(sim.boids);
    assert.ok(sim.boids.every(b => Math.hypot(b.vx, b.vy) <= sim.parameters.maxSpeed));
    sim.step(); sim.reset(); assert.equal(JSON.stringify(sim.boids), initial);
    sim.resize(137, 93);
    for (let i = 0; i < 200; i++) sim.step();
    assert.ok(sim.boids.every(b => b.x >= 0 && b.x < 137 && b.y >= 0 && b.y < 93));
});
test('60 Hz and 144 Hz rendering advance identical fixed physics, with no catch-up after reset', () => {
    function run(hz) {
        const clock = new FixedClock(), sim = new Simulation(1200, 800, { numBoids: 10 });
        let steps = 0;
        for (let frame = 0; frame <= hz * 2; frame++) clock.advance(frame * 1000 / hz, dt => { sim.step(dt); steps++; });
        return { steps, state: sim.boids };
    }
    assert.deepEqual(run(60), run(144)); assert.equal(run(60).steps, 120);
    const clock = new FixedClock(); let count = 0;
    clock.advance(0, () => count++); clock.reset(); clock.advance(100000, () => count++); assert.equal(count, 0);
});
test('social zone extremes remain finite at mobile size with maximum population', () => {
    for (const alignmentRadius of [0, 15, 150]) {
        const sim = new Simulation(390, 844, { ...defaults, alignmentRadius, numBoids: 500 });
        for (let i = 0; i < 100; i++) sim.step();
        assert.ok(sim.boids.every(b => [b.x, b.y, b.vx, b.vy].every(Number.isFinite)));
    }
});

test('manual flight has greater speed and manoeuvrability, and release restores flock limits', () => {
    const sim = scene([bird(0, 100, 100, 0, 0)], { maxSpeed: 3, maxForce: 0.01 });
    sim.step(1 / 60, 0, { right: true });
    assert.ok(sim.boids[0].vx > 0.1, 'direct manual thrust is independent of slow flock turning');
    for (let i = 0; i < 120; i++) sim.step(1 / 60, 0, { right: true });
    assert.ok(sim.boids[0].vx > 3 && sim.boids[0].vx <= 4.5);
    const speed = sim.boids[0].vx;
    sim.capSpeeds(0); assert.equal(sim.boids[0].vx, speed);
    sim.capSpeeds(); assert.ok(sim.boids[0].vx <= 3);
    sim.step(1 / 60, 0, { up: true }); assert.ok(sim.boids[0].vy < -0.1);
});
test('manual flight drag slows a released key and diagonal thrust stays within its speed cap', () => {
    const sim = scene([bird(0, 100, 100, 4, 0)]);
    sim.step(1 / 60, 0); assert.ok(sim.boids[0].vx < 4);
    for (let i = 0; i < 300; i++) sim.step(1 / 60, 0, { right: true, up: true });
    assert.ok(Math.hypot(sim.boids[0].vx, sim.boids[0].vy) <= 4.5);
});
test('blind spot affects social steering but not close collision avoidance', () => {
    const sim = scene([bird(0, 100, 100, 3, 0), bird(1, 40, 100)], { wander: 0 });
    assert.equal(sim.direction(sim.boids[0]), 0);
    sim.parameters.visionAngle = 360; assert.ok(Math.abs(sim.direction(sim.boids[0])) > 3);
    sim.parameters.visionAngle = 270; sim.boids[1].x = 95;
    sim.grid.clear(); sim.boids.forEach(b => sim.grid.add(b));
    assert.equal(sim.direction(sim.boids[0]), 0, 'repulsion sees the bird behind and pushes forward');
});
test('alignment and attraction apply in different distance zones', () => {
    const sim = scene([bird(0, 100, 100, 3, 0), bird(1, 125, 100, 0, 3)], { wander: 0, avoidanceRadius: 10 });
    assert.ok(sim.direction(sim.boids[0]) > 1, 'near neighbour points upward');
    sim.parameters.alignmentRadius = 15;
    assert.equal(sim.direction(sim.boids[0]), 0, 'outer neighbour attracts to the right');
});
