/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",           // root HTML files (index.html, etc.)
        "./*.js",             // root JS (app.js)
        "./js/**/*.js",       // all JS modules in subfolders (settings, finder, ...)
        "./**/*.html",        // any additional HTML fragments
        "!./node_modules/**"
    ],
    darkMode: 'class',
    theme: {
        extend: {},
    },
    plugins: []
}