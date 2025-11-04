/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                "hp-primary": "#0f766e",
                "hp-accent": "#0369a1",
                "hp-bg": "#f8fafc",
                "hp-surface": "#ffffff",
                "hp-success": "#10b981",
                "hp-warning": "#f59e0b",
                "hp-danger": "#ef4444"
            }
        }
    },
    plugins: [],
};