# Device processing and battery review

The ongoing cost is the animated flock, rather than the static website. The local
HTML, CSS, JavaScript and two fonts total about 159 KiB before compression,
excluding pottery photographs. Fonts account for about 73 KiB. Pottery photographs
use responsive WebP files and lazy loading. There are no third-party scripts,
network polling loops or framework runtime in the current page source.

## What is measured

A local diagnostic copy runs the same physics and canvas rendering code, adding
`performance.now()` measurements around each simulation step and draw call.
The flock is allowed to evolve for 3,000 fixed steps before sampling, to include
the cost of established groups. A further 120 animation callbacks warm up drawing
before a 12-second capture. These measurements are not added to the public site.

Host: Apple M1 Pro, 32 GiB memory. Browser: the local in-app Chromium browser
(Chrome 152 user agent). Browser tooling can emulate a phone-sized viewport;
this does **not** emulate a phone processor, battery or thermal limits. One run
per configuration is indicative, not a statistically controlled device survey.

Physics timing measures JavaScript execution on the main thread. Drawing timing
measures JavaScript/canvas command submission, not the full deferred GPU rendering
or compositing cost. Work elsewhere in the browser, the display, networking,
operating-system scheduling and background apps are outside these timers.

## Initial measured results

These captures used the development settings (turning force 0.3, perception 180,
personal space 10, alignment 2, attraction 1 and separation 2), before restoring
the live site defaults for merge. They are indicative of simulation cost, not
a benchmark of the final startup configuration.

The desktop runs used a 1280 × 720 viewport and pixel ratio 1. The browser supplied
approximately 120 animation callbacks/second when it could keep up. “JS time/s”
is the sum of the measured physics and draw-call durations per wall-clock second;
it is **not** the OS CPU-utilisation reading or the whole browser's energy use.

| Population | Physics, mean ms/update | Drawing calls, mean ms/redraw | Measured JS time/s | Observed redraws/s |
| --- | ---: | ---: | ---: | ---: |
| 100 | 0.52 | 0.20 | 55 ms | 120 |
| 200 | 1.52 | 0.29 | 125 ms | 120 |
| 500 | 3.27 | 0.81 | 218 ms | 27 |

At 200 birds, 95% of physics steps took no more than 1.7 ms; at 500, 3.5 ms.
The default was smooth in this run, but still used about one eighth of a second
of main-thread execution time every second. The high population run had a much
lower observed redraw rate. A full graphics trace would be needed to separate
GPU/compositor bottlenecks from browser scheduling; these timers cannot do that.

A separate 390 × 844, pixel-ratio-1 run with 200 birds measured 1.50 ms/update,
0.32 ms/draw and 128 ms of measured JS time/second, with about 120 redraws/second.
This was still the same M1 Pro. The similar cost shows that shrinking the viewport
does not inherently make 200 birds cheaper; it is not evidence of phone performance.

Halving the desktop population from 200 to 100 cut the measured JS time by about
56% in these runs. At 200 birds the physics alone accounted for about 91 ms/s;
drawing submissions added about 34 ms/s. Reducing redraw frequency could save
some rendering work, but does not remove the cost of the 60 Hz physics.

## Work performed continuously

- Physics advances at 60 fixed updates per second while the animation is running.
- Drawing follows the display callback rate. A 120 Hz display can therefore request
  approximately 120 canvas redraws per second, even though physics is still 60 Hz.
- Birds search neighbouring grid cells. Dense groups can approach quadratic work:
  many birds evaluate many of the other birds. Raising population or perception
  can make the simulation substantially more expensive.
- About, Projects, Pottery, Writing and Contact fade the canvas but do not suspend
  the simulation. Reading those sections still incurs the continuous animation cost.
- Pause, reduced-motion startup, a hidden document and the open pottery lightbox
  suspend the simulation loop. One-off redraws still occur for deliberate changes
  such as resizing or adjusting a slider; idle paused state has no recurring flock loop.

## Battery interpretation

Milliseconds of JavaScript are not watts or percentage of battery per hour.
The GPU and screen also use power, and power depends on hardware, clock frequency,
brightness and other device activity. Smooth animation can still consume material
energy because it prevents long idle periods. [WebKit explains these factors and
why eliminating unnecessary ongoing work matters](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/).

The default flock is a continuous interactive workload, not equivalent to an idle
text page. A maximum-size flock is more demanding, particularly on older phones.
Actual battery drain would require timed on-device comparisons with the animation
running and paused, at matched brightness and conditions. No battery drain rate
was measured in this review.

## Best next changes to consider

1. Freeze the flock while reading content sections and resume it on Home. This
   removes the ongoing simulation and canvas workload during reading.
2. Cap visual redraws at 30 or 60 FPS while retaining fixed-step physics, so the
   flock keeps its behaviour without automatically drawing at 120/144 FPS.
3. Use a smaller population on less capable devices, or adapt to measured frame
   cost. A narrow viewport alone does not reliably identify a slower processor.
4. If keeping large flocks is important, profile and reduce per-bird temporary
   arrays/sets and neighbour scans; consider caching the bird glyph for rendering.

These are recommendations only. This change restores the requested controls and
copy without altering the current flock behaviour or its rendering policy.
