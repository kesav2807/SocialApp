// tailwind.config.js
export default {
  content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
],
theme: {
  extend: {
    animation: {
      'fade-in': 'fadeIn 0.6s ease-out forwards'
    },
    keyframes: {
      fadeIn: {
        from: { opacity: 0 },
        to: { opacity: 1 }
      }
    }
  },
},

}
