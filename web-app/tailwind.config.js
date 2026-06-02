/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        // lib/ holds class-token strings consumed by components (e.g.
        // evidenceStrength.js TONE_CLASSES → bg-slate-500 / bg-slate-300 …).
        // Without this glob those classes are purged and render transparent —
        // the "證據力 初步" badge's signal bars vanished because the slate
        // tokens appeared nowhere a .jsx scan would catch.
        "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            keyframes: {
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-down": {
                    "0%": { opacity: "0", transform: "translateY(-10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                }
            },
            animation: {
                "fade-in-up": "fade-in-up 0.3s ease-out forwards",
                "fade-in-down": "fade-in-down 0.3s ease-out forwards",
            },
        },
    },
    plugins: [],
};
