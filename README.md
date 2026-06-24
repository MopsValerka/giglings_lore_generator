# Giglings Lore Generator

AI-powered lore generator for Giglings in the world of Gigaverse.

Enter any Gigling ID and get a unique AI-generated name + lore based on its real on-chain stats: ELO, race history, faction, rarity and traits.

**Built for GIGATHON hackathon.**

---

## What it does

- Fetches live stats from the Gigaverse Racing API (ELO, wins, podiums, traits, faction, rarity)
- Generates a unique name based on the Gigling's profile
- Generates a short lore fragment legend
- Displays the Gigling's actual NFT image, faction badge with color and stat card
- Saves all generated lore in a searchable inscriptions archive
- Copy lore button for easy sharing

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| AI | OpenRouter (any model) |
| Data | Gigaverse REST API |
| Deploy | Railway |

---

## Project structure

```
giglings-lore/
├── server.js              # Express backend — fetches Gigaverse API + generates lore via OpenRouter
├── package.json           # Root package (build + start scripts for Railway)
├── .env.example           # Environment variables template
└── client/                # React frontend (Vite)
    ├── index.html
    ├── vite.config.js     # Proxies /api → localhost:3001 in dev
    ├── package.json
    └── src/
        ├── main.jsx       # React entry point
        └── App.jsx        # Full UI — lore card, inscriptions, faction badges
    └── public/
        └── factions/      # Faction icon PNGs (archon.png, athena.png, etc.)
```

---

## API endpoints

**Our server:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/lore/:petId` | Fetch stats + generate name and lore for a Gigling |

**Gigaverse Racing API (`https://gigaverse.io/api/racing`):**

| Endpoint | Description |
|----------|-------------|
| `GET /pets?ids={id}` | Pet metadata — ELO, wins, races, rarity, faction, traits, NFT image |
| `GET /pets/{id}/stats` | Race stats — podiums, total races, last 15 race results |

---
