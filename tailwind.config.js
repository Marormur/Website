/** @type {import('tailwindcss').Config} */
module.exports = {
    // Keep content scanning lean to avoid large memory use.
    // Scan HTML and TypeScript sources, exclude build outputs and heavy folders.
    content: [
        './index.html', // root HTML file
        './projekte.html', // other root HTML files
        './src/ts/**/*.ts', // source TS where class names originate
    ],
    darkMode: 'class',
    theme: {
        extend: {},
    },
    plugins: [],
    // Optimize watch mode for memory efficiency
    corePlugins: {},
};
