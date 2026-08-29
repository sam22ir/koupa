// Required because global.css is imported from TypeScript. Without this,
// `import './global.css'` fails typecheck. Metro/Uniwind handle the actual
// stylesheet processing — this declaration is types-only.
declare module '*.css';