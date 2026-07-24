# CLAUDE.md — Website Design & Frontend Quality Rules

Use this file as the default design and frontend quality guide for every website project.

## Core Principle

Every website must feel intentional, memorable, and product-focused.  
Do not build generic layouts. The site must have a clear point of view, a strong visual personality, and a polished user experience.

---

## 1. Clear Point of View

Before designing or coding, define the website’s design direction.

Every project must answer:

- What personality should this website have?
- What should the user feel in the first 5 seconds?
- What is the main business goal?
- What visual style supports that goal?

Avoid neutral, template-like designs unless the project specifically requires it.

Examples of possible points of view:

- Premium and cinematic
- Fresh and friendly
- Clean and trustworthy
- Bold and energetic
- Elegant and minimal
- Futuristic and interactive
- Local, warm, and authentic

The design must support the business identity, not just look modern.

---

## 2. Typography With Personality

Typography must strongly match the website’s point of view.

Avoid default or overused fonts unless there is a strong reason.  
Do not rely on generic font choices such as Arial, Helvetica, Roboto, or basic system fonts as the main visual identity.

Use fonts that feel designed, expressive, and intentional, while staying readable.

Typography rules:

- Choose one strong display font for headings.
- Choose one clean, readable font for body text.
- Create clear contrast between headings, body text, labels, and buttons.
- Use font weight, size, spacing, and line-height carefully.
- Typography should feel connected to the brand personality.

The font choice should never feel random.

---

## 3. Simple but Cohesive Colour System

Use a simple, controlled, and cohesive colour palette.

Avoid using too many colours.  
Prefer a small set of colours that work together and repeat consistently across the site.

Colour system should include:

- Primary brand colour
- Secondary/accent colour
- Background colours
- Text colours
- Border/divider colours
- Interaction states such as hover, focus, active, and disabled

Rules:

- Colours must support the website’s point of view.
- Use contrast properly for readability and accessibility.
- Do not use random gradients or decorative colours without purpose.
- Maintain consistency across all sections.

---

## 4. Strong Visual Hierarchy

The design must guide the user’s eye toward the main goal of the website.

Every page and section must have a clear priority:

1. Main message
2. Supporting explanation
3. Main call-to-action
4. Secondary information
5. Supporting visuals/details

Use hierarchy through:

- Size
- Spacing
- Contrast
- Position
- Typography
- Motion
- Imagery
- Layout rhythm

The user should immediately understand what matters most.

---

## 5. High-Quality Visuals

Use high-quality, relevant, and professional visuals.

Do not use low-resolution, stretched, pixelated, generic, or unrelated images.

Visual rules:

- Images must match the brand style.
- Crop images intentionally.
- Optimise images for fast loading.
- Use modern formats where possible, such as WebP or AVIF.
- Add meaningful alt text.
- Avoid stock images that feel fake or disconnected.
- If placeholders are used, clearly mark them and design around the final expected image style.

Visuals should improve trust, emotion, and clarity.

---

## 6. Purposeful Animation

Use subtle, smooth, and meaningful animation.

Animation should support the experience, not distract from it.

Good animation examples:

- Smooth section reveal
- Gentle hover feedback
- Small button movement
- Soft image/parallax motion
- Scroll-based storytelling
- Micro-interactions that confirm user actions

Animation rules:

- Keep motion calm and refined.
- Avoid excessive bouncing, spinning, shaking, or random movement.
- Animation must have a purpose.
- Respect performance.
- Respect reduced-motion preferences.
- Motion should feel premium, not cheap.

---

## 7. Separate Mobile Experience

Do not only make the desktop layout responsive.

Create a mobile-specific version of the experience when needed.

Mobile design must be considered separately:

- Mobile navigation
- Mobile hero layout
- Mobile typography scale
- Mobile spacing
- Mobile image cropping
- Mobile CTA placement
- Mobile animation behaviour
- Mobile scrolling experience
- Mobile loading performance

The mobile version should feel intentionally designed, not squeezed down from desktop.

For important sections, create separate mobile structure if required instead of forcing the desktop structure to fit.

---

## 8. Invisible Quality

Invisible quality is mandatory.

The website must feel smooth, fast, stable, and professional even before the user notices why.

Pay attention to:

- Loading speed
- Scroll smoothness
- Interaction responsiveness
- Layout stability
- Image optimisation
- Code structure
- Accessibility
- SEO basics
- Performance on mobile
- Clean component architecture
- Proper spacing consistency
- No visual glitches
- No broken hover/focus states
- No unnecessary heavy libraries
- No blocking assets
- No oversized images
- No messy duplicated CSS

The website should feel premium because every small detail works correctly.

---

## 9. Frontend Implementation Standards

When coding:

- Use clean, maintainable component structure.
- Use semantic HTML.
- Keep CSS organised and reusable.
- Avoid hardcoded random values where design tokens would be better.
- Use consistent spacing scale.
- Use accessible buttons, links, forms, and labels.
- Optimise assets before using them.
- Keep animations performant using transform and opacity where possible.
- Avoid layout shift.
- Test desktop, tablet, and mobile views.
- Test real mobile behaviour, not only browser resizing.

---

## 10. Before Final Output Checklist

Before considering the website finished, check:

- Does the website have a clear personality?
- Does the typography match the personality?
- Is the colour palette cohesive?
- Is the visual hierarchy clear?
- Are the images high quality and well-cropped?
- Are animations subtle and purposeful?
- Does mobile feel separately designed?
- Is the website fast and smooth?
- Are there any visual bugs?
- Is the code clean and easy to extend?

If any answer is weak, improve the design before finalising.

---

## Instruction to Claude

Whenever working on this project, follow this document as a design and frontend quality system.

Do not produce generic website layouts.

Always explain important design decisions briefly before implementing them, especially:

- Point of view
- Typography
- Colour system
- Visual hierarchy
- Mobile experience
- Performance and invisible quality

If the current design does not meet this standard, suggest improvements before continuing.

## Code Separation Rule

Do not put HTML, CSS, and JavaScript all inside one single HTML file unless it is only a quick demo or temporary prototype.

For real projects, separate files clearly:

- HTML for page structure
- CSS for styling and layout
- JavaScript for interactions, animations, and logic

Preferred structure:

/project
index.html
/css
styles.css
/js
main.js
/assets
images/
icons/
fonts/

Keep files modular, readable, and easy to maintain.

Avoid large single-file code unless specifically requested.
