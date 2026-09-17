# maxwellriess.com
My personal website.

Run locally with `python3 -m http.server 8765`, then open http://localhost:8765.
Run regression checks with `node --test tests/*.test.cjs` (Node 18 or newer; no dependencies).

The flock physics, defaults and fixed timestep live in `assets/js/flock.js`.
`assets/js/main.js` connects rendering, controls, navigation and the gallery.
There are no visible presets, reset button or seed controls. Changing Population
starts a fresh random arrangement and keeps the other sliders. Tests can still pass a seed for repeatable runs.
Reduced motion starts the flock paused; Resume explicitly opts into animation.

The model uses local distance zones, inspired by [Couzin et al. (2002)](https://jmvidal.cse.sc.edu/library/couzin02a.pdf):

- Personal space: omnidirectional repulsion, prioritised over social steering.
- Alignment range: match headings outside personal space, up to this distance.
- Perception: beyond alignment range, attract towards visible neighbours up to this distance.
- A 270-degree field of view, bounded turning and smooth individual wandering.

Zones are clipped by perception for social interactions; personal-space repulsion
still works independently. An alignment range at or below personal space removes
the alignment zone. An alignment range above perception removes the attraction zone.
Cruising speed is maintained while heading changes are limited by Turning force.
There is no global centre, scripted orbit or preferred rotation direction.

The startup values preserve the live site settings verified on 17 September 2026:
population 200, size 14, speed 3, turning force 0.1, perception 70, personal
space 30, alignment 4.5, attraction 0.1 and separation 1.8. New model controls
start at alignment range 35, field of view 270 degrees and wander 0.08.
Self control starts at 1. Corrected physics means identical numbers do not
reproduce the old trajectories.

For exploring the new behaviours, use these starting points with population 200, speed 3, turning force 0.3, perception 180,
personal space 10, attraction 1, separation 2 and wander 0.08:

| Behaviour | Alignment range | Alignment |
| --- | ---: | ---: |
| Swarming | 0 | 1 |
| Circling | 20 | 1 |
| Travelling flock | 35 | 2 |

Give changes 30–80 seconds to settle. To start afresh, move Population by one
and back again. These are emergent states: starting arrangement, density, screen
size and earlier movement can produce different outcomes, including multiple
mills or a travelling group. Smaller bird sizes make dense groups easier to read.

The Take Control easter egg appears only on the Behavior tab when Self control
is at its maximum (5). Lowering it hides the button and releases the bird.
Self control is an unlock, not an extra flocking force. The selected bird uses direct thrust and drag, with a 1.5×
speed limit and extra manoeuvrability. Release, population changes and section navigation
return it to normal flock limits. Changing unrelated sliders preserves the speed
advantage while control remains active.
