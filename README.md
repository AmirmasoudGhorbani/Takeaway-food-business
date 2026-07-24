# Kebab Station Kumeu

Marketing website for Kebab Station Kumeu — halal lamb and chicken doner, Kumeu, Auckland.

## Stack

Static HTML/CSS/JS, deployed to GitHub Pages via GitHub Actions.

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

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes the site to GitHub Pages.
