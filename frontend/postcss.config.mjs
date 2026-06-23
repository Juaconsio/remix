// Empty PostCSS config — Tailwind CSS is handled by @tailwindcss/vite (Vite plugin),
// not PostCSS. This file exists to prevent Vite from picking up the root
// postcss.config.mjs which references @tailwindcss/postcss.
export default { plugins: {} };
