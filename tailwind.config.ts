import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        navy: "var(--navy)",
        "navy-mid": "var(--navy-mid)",
        red: "var(--red)",
        "red-dark": "var(--red-dark)",
        gold: "var(--gold)",
        bg: "var(--bg)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        green: "var(--green)",
        "green-dark": "var(--green-dark)",
        "green-text": "var(--green-text)",
        "green-soft": "var(--green-soft)",
        "green-bg": "var(--green-bg)",
        "green-border": "var(--green-border)",
        orange: "var(--orange)",
        "loading-violet": "var(--loading-violet)",
        "loading-violet-deep": "var(--loading-violet-deep)",
        "loading-violet-muted": "var(--loading-violet-muted)",
        "loading-violet-soft": "var(--loading-violet-soft)",
        "loading-violet-border": "var(--loading-violet-border)",
        warn: "var(--warn-text)",
        "warn-bg": "var(--warn-bg)",
        "warn-border": "var(--warn-border)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        base: "13px",
      },
      width: {
        "icon-xs": "var(--icon-xs)",
        "icon-sm": "var(--icon-sm)",
        "icon-md": "var(--icon-md)",
        "icon-lg": "var(--icon-lg)",
        "icon-xl": "var(--icon-xl)",
      },
      height: {
        "icon-xs": "var(--icon-xs)",
        "icon-sm": "var(--icon-sm)",
        "icon-md": "var(--icon-md)",
        "icon-lg": "var(--icon-lg)",
        "icon-xl": "var(--icon-xl)",
      },
    },
  },
};

export default config;
