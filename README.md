# Giglings Lore Generator

AI-powered lore generator for Giglings in the world of Gigaverse.

Enter any Gigling ID and get a unique AI-generated name + lore based on its real on-chain stats: ELO, race history, faction, rarity and traits.

**Built for GIGATHON hackathon.**

🔗 **Live:** [giglings-lore.up.railway.app](https://giglings-lore-generator.up.railway.app)

---

<p align="center">
  <img src="./docs/card-example.jpeg" alt="Gigling lore card — Flash Gordon #16916, Legendary Overseer" width="320" />
</p>

---

## What it does

- Fetches live stats from the Gigaverse Racing API (ELO, wins, podiums, traits, faction, rarity)
- Generates a unique name based on the Gigling's profile
- Generates a short lore fragment legend
- Displays the Gigling's actual NFT image, faction, rarity and racing stats
- Saves all generated lore in a searchable inscriptions archive. Stores on Upstash Redis
- Copy button for easy lore card sharing

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| AI | OpenRouter (any model) |
| Data | Gigaverse Racing API |
| Storage | Upstash Redis |
| Deploy | Railway |

---

## Project structure

```
giglings-lore/
├── server.js              # Express backend — Gigaverse API proxy + OpenRouter lore gen + Redis
├── package.json           # Root package (build + start scripts for Railway)
├── .env.example           # Environment variables template
└── client/                # React frontend (Vite)
    ├── index.html
    ├── vite.config.js     # Proxies /api → localhost:3001 in dev
    ├── package.json
    └── src/
        ├── main.jsx       # React entry point
        └── App.jsx        # Full UI — GiglingCard component, inscriptions grid, faction badges
    └── public/
        ├── factions/      # Faction icon PNGs (archon.png, athena.png, chobo.png, ...)
        └── fonts/         # Bitcell.ttf (unused; Silkscreen loaded from Google Fonts)
```

---

## API endpoints

**Our server:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/lore/:petId` | Fetch stats + generate name and lore for a Gigling |
| `GET /api/inscriptions` | Return all saved inscriptions from Redis (newest first) |
| `POST /api/inscriptions` | Save a new inscription to Redis |

**Gigaverse Racing API (`https://gigaverse.io/api/racing`):**

| Endpoint | Description |
|----------|-------------|
| `GET /pets?ids={id}` | Pet metadata - ELO, wins, races, rarity, faction, traits, NFT image |
| `GET /pets/{id}/stats` | Race stats - podiums, total races, last 15 race results |

---
