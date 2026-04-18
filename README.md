# SnapCal AI

A lightweight calorie tracker inspired by camera-first apps like Cal AI.

## Features

- 📸 **Photo-first meal tracking** with smart calorie and protein estimates.
- 🎯 **Daily target management** (calories + protein).
- 📊 **Live dashboard** (consumed, remaining, progress bar, status).
- 🧠 **AI coach suggestions** based on profile goals and meal habits.
- 👤 **Profile management** with focus modes (fat loss, maintenance, muscle gain, performance).
- 🔥 **Daily streak tracking** for consistency.
- ✨ **Animated modern UI** with glassmorphism and reveal effects.
- 💾 **Persistent local log** using browser `localStorage`.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Notes

- This demo uses heuristic food inference from image/file names and optional food text.
- To improve estimate quality, include recognizable keywords in meal names (e.g. "pizza", "salad", "chicken").

## Vercel deployment fix

If you deploy on Vercel and see `404: NOT_FOUND`, make sure the project root is this folder and keep the included `vercel.json` rewrite so all routes resolve to `index.html` for SPA behavior.
