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
