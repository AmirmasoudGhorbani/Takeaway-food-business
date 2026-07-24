# Client Project Workflow — Web Development

> Reusable checklist and reference for building static marketing websites.
> Copy this file into each new project folder and fill in the client details.

---

## 1. Client Details

| Field              | Value |
| ------------------ | ----- |
| Business name      | Kebab Station Kumeu |
| Contact name       | TBC |
| Phone              | 09 412 6030 |
| Email              | TBC |
| Website URL        | TBC |
| Domain             | TBC |
| Industry           | Halal doner kebab restaurant / takeaway |
| Location / Areas   | 2/42 Main Road, Kumeu, Auckland |

---

## 2. Code Standards

### Clean Code
- Write readable, self-explanatory code — if a variable or function name explains itself, no comment is needed
- Use meaningful names: `handleFormSubmit()` not `doStuff()`, `coverageAreas` not `data2`
- Keep functions short and single-purpose — one function does one thing
- Remove dead code, unused variables, and commented-out blocks — don't leave them "just in case"
- No magic numbers — use named constants (`const MAX_PARTICLES = 11000` not just `11000`)

### Organised & Separated
- **HTML** — structure and content only. No inline styles, no inline scripts in production
- **CSS** — all styles in `styles.css`. Use CSS custom properties (variables) for colours, spacing, fonts
- **JavaScript** — each feature in its own file under `js/`. One module per concern:
  - `hero.js` handles the hero, `chat.js` handles the chat, `leads.js` handles forms, etc.
  - Never put unrelated logic in the same file
- **Assets** — images, logos, and media in `assets/`. Organised into subfolders by type (e.g. `assets/work/`)
- **Config** — deployment and CI/CD in `.github/workflows/`

### Separation of Concerns
| Layer       | Responsibility                  | Files              |
| ----------- | ------------------------------- | ------------------ |
| Structure   | Content, semantics, accessibility | `index.html`       |
| Presentation| Layout, colours, animations, responsiveness | `styles.css`       |
| Behaviour   | Interactivity, data, API calls  | `js/*.js`, `js/*.jsx` |
| Assets      | Images, logos, icons             | `assets/`          |
| Deployment  | CI/CD pipeline                   | `.github/workflows/` |

### Formatting Rules
- Consistent indentation (2 spaces)
- Consistent naming: `kebab-case` for CSS classes, `camelCase` for JS variables/functions
- Group related CSS rules together with section comments (`/* ===== HERO ===== */`)
- Group related HTML sections with comments (`<!-- ===== SERVICES ===== -->`)
- Keep lines under 100 characters where practical

### Before Committing
- No console.log() left in production code
- No unused imports, variables, or functions
- No hardcoded test data or placeholder text
- All files formatted consistently
- Test on mobile and desktop before pushing

### AI Tool Rules (prevent AI showing as contributor)
- Never use the **claude.ai GitHub integration** to push commits directly to a repo — it creates a `claude/` branch under its own GitHub account and appears as a contributor in the repo sidebar
- Never include `Co-Authored-By: Claude...` lines in commit messages — GitHub reads these and counts them as contributions
- If a `claude/` branch was accidentally created (from a merged AI-generated PR), delete it immediately: `gh api -X DELETE repos/{owner}/{repo}/git/refs/heads/claude/{branch-name}`
- Always make AI-assisted commits locally through your own terminal — the commit author stays as you

### Futuristic Design Language
Every project should feel cinematic, immersive and premium — not like a generic template.

#### Visual Aesthetic
- **Dark, deep backgrounds** — deep navy/space tones (`#04070f`), not plain black or white
- **Electric accent colours** — cyan, blue, violet glows for highlights and interactive elements
- **Glass-morphism** — frosted glass panels with `backdrop-filter: blur()`, subtle borders, soft shadows
- **Glow effects** — gradient buttons with box-shadow glows, hover state light-ups
- **Typography** — modern display fonts (Space Grotesk, Inter, Manrope) paired with clean body fonts

#### Particle & Canvas Animations
- **Particle hero** — full-viewport HTML5 Canvas particle fields that morph between shapes (logos, icons, maps)
- **Cursor interaction** — particles repel from mouse with physics-based movement
- **Animated backgrounds** — drifting nodes, connectivity mesh lines, signal rings, data pulses
- **Performance first** — use `requestAnimationFrame`, not `setInterval`. Target 60fps
- **Graceful degradation** — detect `prefers-reduced-motion` and provide CSS fallbacks for low-end devices
- Each animation gets its own JS file (`hero.js`, `background.js`, `coverage.js`)

#### Cinematic Scroll
- **Reveal-on-scroll** — sections fade/slide in as they enter the viewport using `IntersectionObserver`
- **Staggered reveals** — child elements animate in sequence (e.g. cards appear one by one with delay)
- **Parallax layers** — background elements scroll at different speeds for depth
- **Scroll-triggered animations** — progress bars, counters, map overlays activate as user scrolls to them
- **Smooth transitions** — use CSS `transition` and `transform` (never animate `width`, `height`, `top`, `left`)
- **Section kickers** — animated eyebrow text above headings that slides in before the title

#### Animated Components
- **3D card carousels** — service cards with `preserve-3d`, perspective transforms, drag/swipe interaction
- **Liquid-glass effects** — specular highlights, travelling shine animations, volumetric depth layers
- **Hover micro-interactions** — subtle scale, glow, or parallax on interactive elements
- **Loading/transition states** — typing indicators, skeleton screens, smooth state changes
- **Auto-rotating showcases** — testimonials, work galleries with crossfade or slide transitions

#### Performance Rules for Animations
- Canvas animations: pause when off-screen using `IntersectionObserver`
- Use `will-change` and `transform: translateZ(0)` for GPU-accelerated layers
- Throttle mouse/touch event handlers with `requestAnimationFrame`
- Reduce particle count on mobile (check `window.innerWidth`)
- Test on low-end devices — if it drops below 30fps, simplify

---

## 3. Project Setup Checklist

### Repository
- [ ] Create GitHub repo (private or public)
- [x] Add `.gitignore` (node_modules, .env, .DS_Store, etc.)
- [x] Add `.nojekyll` (prevents GitHub Pages from running Jekyll)
- [x] Add `LICENSE` file
- [ ] Set up GitHub Pages deployment (Settings > Pages > Source: GitHub Actions)
- [x] Add `deploy.yml` workflow to `.github/workflows/`

### Domain & Hosting
- [ ] Configure custom domain (CNAME file or repo settings)
- [ ] Verify DNS records are pointing correctly
- [ ] Enable HTTPS

---

## 4. Standard File Structure

```
project-name/
│
├── index.html                  # Production page
├── styles.css                  # All styles (design system + components)
│
├── assets/
│   ├── brand-mark.png          # Client logo
│   ├── favicon.ico             # Browser tab icon (or base64 in HTML)
│   └── work/                   # Portfolio / gallery images
│       └── ...
│
├── js/
│   ├── main.js                 # Navigation, scroll reveals, counters
│   ├── hero.js                 # Hero section animation
│   ├── carousel.jsx            # Service carousel (React, if used)
│   ├── chat.js                 # Live chat assistant
│   ├── leads.js                # Contact form + lead delivery
│   ├── reviews.js              # Testimonials / reviews
│   └── ...                     # Additional modules as needed
│
├── .github/workflows/
│   └── deploy.yml              # GitHub Pages auto-deploy
│
├── .gitignore
├── .nojekyll
├── LICENSE
├── README.md
└── PROJECT-NOTES.md            # Client-specific notes (copy of this file)
```

---

## 5. Language / Tech Reference

| Language / Tech   | Purpose                                   |
| ----------------- | ----------------------------------------- |
| HTML5             | Page structure, semantic sections, SEO meta |
| CSS3              | Design system, animations, responsive layout |
| JavaScript (ES6)  | Interactivity, Canvas animations, forms    |
| JSX (React 18)    | Complex UI components (loaded via CDN)     |
| YAML              | GitHub Actions CI/CD pipeline              |

---

## 6. Third-Party Services Setup

### Web3Forms (Contact Form)
1. Go to https://web3forms.com
2. Enter the **client's business email**
3. Copy the generated API key
4. Paste into `js/leads.js` → `w3fKey` field
5. Also update the `email` field for mailto fallback
6. **Test the form** — submit a test enquiry and confirm it arrives

### Google Reviews
- Collect reviews from the client's Google Business profile
- Add them to `js/reviews.js` as data objects
- Include: reviewer name, star rating, review text, date

### Images & Assets
- Get the client's logo (PNG with transparent background, min 600x600)
- Compress all images before adding (TinyPNG, Squoosh, etc.)
- Generate favicon from logo (32x32 and 180x180 for apple-touch-icon)
- Embed as base64 in `<head>` for instant loading, or use separate files

---

## 7. Pre-Launch Checklist

### Content
- [ ] All placeholder text replaced with real business content
- [ ] Correct business name, phone, email everywhere
- [ ] Services list matches what the client actually offers
- [ ] Coverage/service areas are accurate
- [ ] Testimonials are real and attributed
- [ ] Footer links are correct (phone, email, social media)

### Contact & Leads
- [ ] Web3Forms API key is registered to the **client's email** (not yours)
- [ ] Contact form tested — submissions arrive at client's inbox
- [ ] Mailto fallback works if Web3Forms is down
- [ ] Phone number links (`tel:`) are correct
- [ ] Email links (`mailto:`) are correct

### Live Chat (if included)
- [ ] System prompt updated with correct business info
- [ ] Keyword fallback replies cover all services
- [ ] Coverage areas are accurate in chat responses
- [ ] Callback form sends leads to the right email
- [ ] Chat tested with common customer questions

### SEO & Meta
- [ ] Page title includes business name and location
- [ ] Meta description is compelling and under 160 characters
- [ ] Open Graph tags set (title, description, image)
- [ ] Favicon is showing in browser tab
- [ ] Apple touch icon is set

### Performance & Responsiveness
- [ ] Tested on mobile (iPhone, Android)
- [ ] Tested on tablet
- [ ] Tested on desktop (Chrome, Safari, Firefox)
- [ ] Images are compressed and optimised
- [ ] No console errors in browser dev tools
- [ ] Page loads in under 3 seconds

### Deployment
- [ ] GitHub Pages is active and serving the site
- [ ] Custom domain is connected (if applicable)
- [ ] HTTPS is working
- [ ] All pages/sections load correctly on live URL

---

## 8. Handover to Client

- [ ] Share the live URL with the client
- [ ] Walk them through the contact form and where enquiries go
- [ ] Explain how the live chat works
- [ ] Provide login details for any third-party services (Web3Forms, domain registrar)
- [ ] Document any ongoing costs (domain renewal, etc.)

---

## 9. Common File Explanations

| File              | What it does                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| `.nojekyll`       | Tells GitHub Pages to skip Jekyll — serve files as-is. Don't delete.    |
| `.gitignore`      | Tells Git which files to ignore (node_modules, .env, .DS_Store, etc.)   |
| `deploy.yml`      | GitHub Actions workflow — auto-deploys to GitHub Pages on push to main. |
| `leads.js`        | Handles form submissions via Web3Forms API + mailto fallback.           |
| `chat.js`         | Live chat widget — runs on keyword matching, no AI backend needed.      |
| `README.md`       | Public project documentation shown on GitHub repo page.                 |

---

## 10. Reusable GitHub Actions Deploy Config

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 11. Reusable .gitignore

```
node_modules/
.env
.DS_Store
*.log
.claude/settings.local.json
```
