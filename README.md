# Holiday Balance Lab (ScreenTimeSimulator)

A lightweight, browser-only simulation for exploring how holiday screen time patterns affect a teen's movement, fitness, and comfort. Build a 15-minute block schedule, apply realistic randomness, and compare balanced alternatives to typical holiday drift.

## How it works
- **Schedule builder**: Paint activities (MVPA, light, strength, screens, outdoor time) across a 24h grid. The pattern repeats daily across the selected holiday horizon (1–6 weeks).
- **Stochastic layer**: Motivation/compliance introduces block drift, binge chances, spontaneous activity, and optional device hand-in or active gaming substitution.
- **Metrics**: MVPA, longest sedentary streak, screen exposure, discomfort and eye-strain risk, balance score, and a directional weight trend are computed using the system-dynamics-inspired formulas in `script.js`.
- **Presets & comparisons**: One-click presets for your current deal, a balanced variant, and holiday drift, plus a weekly report with plain-language risk flags.

## Running locally
No build tools are required. Open `index.html` in a modern browser. All logic and styling live in static files (`script.js`, `styles.css`).

## Exporting scenarios
Use the "Export scenario JSON" button in the app to copy the current schedule and configuration for reuse or sharing.
