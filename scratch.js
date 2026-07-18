const colors = {
  "on-secondary-fixed": "#271900",
  "secondary": "#7b5800",
  "on-tertiary-container": "#f7feff",
  "tertiary-fixed": "#a7eefc",
  "on-surface": "#241911",
  "surface-container": "#ffeadd",
  "primary": "#a03f28",
  "on-primary": "#ffffff",
  "error-container": "#ffdad6",
  "background": "#fff8f5",
  "on-secondary-fixed-variant": "#5d4200",
  "inverse-on-surface": "#ffede3",
  "on-tertiary": "#ffffff",
  "on-secondary-container": "#6f4f00",
  "on-tertiary-fixed-variant": "#004e59",
  "primary-container": "#c0573e",
  "on-surface-variant": "#56423d",
  "on-primary-fixed": "#3d0700",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#fff1e9",
  "surface-container-high": "#fae4d6",
  "surface-bright": "#fff8f5",
  "surface-variant": "#f4ded0",
  "on-error": "#ffffff",
  "surface-container-highest": "#f4ded0",
  "primary-fixed-dim": "#ffb4a3",
  "secondary-fixed": "#ffdea6",
  "secondary-container": "#ffbe30",
  "tertiary-fixed-dim": "#8bd2df",
  "surface-tint": "#a03f29",
  "tertiary": "#106571",
  "primary-fixed": "#ffdad2",
  "secondary-fixed-dim": "#fcbc2c",
  "on-primary-container": "#120100",
  "error": "#ba1a1a",
  "on-background": "#241911",
  "inverse-surface": "#3b2e24",
  "on-primary-fixed-variant": "#812914",
  "outline-variant": "#ddc0ba",
  "inverse-primary": "#ffb4a3",
  "surface": "#fff8f5",
  "on-tertiary-fixed": "#001f24",
  "on-secondary": "#ffffff",
  "outline": "#8a726c",
  "surface-dim": "#ecd6c8",
  "on-error-container": "#93000a",
  "tertiary-container": "#347e8b"
};

let rootVars = ":root {\n";
let darkVars = ".dark {\n";
let twConfig = "";

for (const [key, value] of Object.entries(colors)) {
  rootVars += `  --color-${key}: ${value};\n`;
  twConfig += `  "${key}": "var(--color-${key})",\n`;
  
  // Create a naive dark mode mapping:
  if (key.includes('background') || key.includes('surface') || key === 'error-container' || key.includes('outline-variant')) {
      if (key.startsWith('on-')) {
          darkVars += `  --color-${key}: #e2e8f0;\n`; // light text
      } else {
          // dark background
          if (key.includes('lowest')) darkVars += `  --color-${key}: #0f172a;\n`;
          else if (key.includes('low')) darkVars += `  --color-${key}: #1e293b;\n`;
          else if (key.includes('high')) darkVars += `  --color-${key}: #334155;\n`;
          else if (key.includes('highest')) darkVars += `  --color-${key}: #475569;\n`;
          else darkVars += `  --color-${key}: #020617;\n`;
      }
  } else {
      // keep accents the same or slightly muted for dark mode
      darkVars += `  --color-${key}: ${value};\n`;
  }
}
rootVars += "}\n";
darkVars += "}\n";

console.log("=== TW CONFIG ===");
console.log(twConfig);
console.log("\n=== CSS ===");
console.log(rootVars);
console.log(darkVars);
