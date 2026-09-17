const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Simulation } = require('../assets/js/flock.js');
function metrics(sim){const bs=sim.boids; // Compact components, so circulation is measured around each local group.
 const parents=bs.map((_,i)=>i);function root(i){while(parents[i]!==i)i=parents[i];return i;}
 const delta=(d,w)=>d>w/2?d-w:d<-w/2?d+w:d;
 for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++)if(Math.hypot(delta(bs[i].x-bs[j].x,sim.width),delta(bs[i].y-bs[j].y,sim.height))<sim.parameters.perceptionRadius)parents[root(i)]=root(j);
 const groups=new Map();bs.forEach((b,i)=>{const k=root(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);});
 let pol=0,rot=0,largest=0,nearest=0;
 for(const group of groups.values()){
 const ref=group[0];let cx=0,cy=0;for(const b of group){cx+=delta(b.x-ref.x,sim.width);cy+=delta(b.y-ref.y,sim.height);}cx/=group.length;cy/=group.length;
 let vx=0,vy=0,m=0;for(const b of group){const speed=Math.hypot(b.vx,b.vy);vx+=b.vx/speed;vy+=b.vy/speed;const dx=delta(b.x-ref.x,sim.width)-cx,dy=delta(b.y-ref.y,sim.height)-cy;const r=Math.hypot(dx,dy);if(r>0)m+=(dx*b.vy-dy*b.vx)/(r*speed);}
 pol+=Math.hypot(vx,vy);rot+=Math.abs(m);largest=Math.max(largest,group.length);
 }
 return {p:pol/bs.length,m:rot/bs.length,largest:largest/bs.length,groups:groups.size};
}

// Deterministic long runs check the qualitative states, not exact trajectories.
// Circulation is measured separately per connected local group on the torus.
test('local zones can sustain both a disordered swarm and circulating groups', () => {
    const outcomes = [];
    for (const alignmentRadius of [0, 20]) {
        const sim = new Simulation(1200, 800, { alignmentRadius, alignmentWeight: 1, maxForce: 0.3, perceptionRadius: 180, avoidanceRadius: 10, cohesionWeight: 1, separationWeight: 2 }, 3);
        const samples = [];
        for (let i = 0; i < 3600; i++) {
            sim.step();
            if (i >= 2400 && i % 300 === 0) samples.push(metrics(sim));
        }
        outcomes.push(Object.fromEntries(['p', 'm', 'largest'].map(key =>
            [key, samples.reduce((sum, value) => sum + value[key], 0) / samples.length])));
    }
    const [swarm, circle] = outcomes;
    assert.ok(swarm.p < 0.4 && swarm.m < 0.4, JSON.stringify({ swarm }));
    assert.ok(swarm.largest > 0.3, 'swarm must aggregate rather than scatter');
    assert.ok(circle.p < 0.4 && circle.m > 0.6, JSON.stringify({ circle }));
    assert.ok(circle.largest > 0.3, 'circulation must involve substantial groups');
});
