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
        orange: "var(--orange)",
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
