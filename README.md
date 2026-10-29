# Kebab Station Kumeu

Marketing website for Kebab Station Kumeu — halal lamb and chicken doner, Kumeu, Auckland.

**Live site:** https://kebabstationkumeu.com/

## Stack

Static HTML/CSS/JS, hosted on Cloudflare Pages.

## Structure

```
index.html        Production page
css/styles.css     Design system + component styles
js/main.js         Navigation, scroll reveals, animations
assets/images/      Photography
```

## Local development

Open `index.html` directly in a browser, or serve the folder with any static file server.

## Deployment

Cloudflare Pages is connected to this repository: every push to `main` deploys automatically
(no build step; output directory `/`). DNS for `kebabstationkumeu.com` is also on Cloudflare.

## Regression checks

Run `node --test tests/hero-startup.test.cjs` to check first-frame preparation,
scroll handoff, media failure, and reduced-motion/data-saver fallbacks.

The tests simulate metadata-only media, denied playback, missing frame/seek
callbacks, tab suspension, and page restoration. Muted play/pause primes the
decoder; touch/click retries a denied attempt. Scroll control does not wait for
poster handoff. A one-second seek retry and visibility/pageshow recovery prevent
an interrupted seek from permanently freezing the hero.

These are controller regression tests, not physical iPhone Safari tests.
