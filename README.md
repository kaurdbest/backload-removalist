# Backload Removalist — Website

Plain HTML/CSS/JS, no build step. Open `index.html` directly, or run any static server from this folder (e.g. `python3 -m http.server 4173`).

## Real assets in use

Your photos, video, and logo (from `images/`) are already wired in:
- `images/logo-icon-transparent.png` / `logo-icon-square.png` — cropped from your `Logo.jpeg`, used in the header nav and as the favicon
- `images/hero-aerial.mp4` (poster: `hero-truck.jpg`) — full-bleed hero background video, plays on load and pauses when scrolled out of view
- `images/happy-customers.jpg` — guarantee section
- `images/loading-action.jpg`, `images/team-view.jpg` — trust section
- `images/truck-mountains.jpg` — social share preview image (og:image)
- Not yet used on the page: `storage-truck.jpg`, `truck-reversing.mp4` — kept in the folder for a future page/section or social media

## Still to do before this fully goes live

**1. Confirm the real interstate routes:**
- In `index.html`, search for `ROUTE LIST` and swap the placeholder state-pairs for the real ones.

Done already:
- Quote form and the entry popup are both wired to a live Web3Forms access key — submissions from either one email straight to Backloadremovalist@gmail.com. The same key is reused across both forms, which is supported (a Web3Forms key isn't tied to a single form).

## Logo note
The header uses a cropped/matted version of your real `Logo.jpeg`. The footer still uses a hand-built SVG recreation of the same mark (in navy-square form) because it needs to sit on a dark background — a plain crop of the logo has a light backing that doesn't read well on navy. If you get a proper transparent-background export of the logo from your designer, it can replace both.
