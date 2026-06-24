import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;
const BASE = 'https://gigaverse.io/api/racing';

const OR_KEY   = process.env.OPENROUTER_API_KEY;
const OR_MODEL = process.env.OR_MODEL || 'google/gemini-flash-1.5';

app.use(cors());
app.use(express.json());

// ── Gigaverse API ────────────────────────────────────────────────────────
async function gigaFetch(p) {
  const r = await fetch(BASE + p);
  if (!r.ok) throw new Error(`gigaverse ${p} → ${r.status}`);
  return r.json();
}

// ── OpenRouter ───────────────────────────────────────────────────────────
async function generateLore(prompt) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://giglings-lore.up.railway.app',
      'X-Title': 'Giglings Lore',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter error ${r.status}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() ?? 'The archives are silent on this one.';
}

// ── GET /api/lore/:petId ─────────────────────────────────────────────────
app.get('/api/lore/:petId', async (req, res) => {
  const petId = Number(req.params.petId);
  if (!petId || isNaN(petId)) return res.status(400).json({ error: 'Invalid petId' });

  try {
    const petData = await gigaFetch(`/pets?ids=${petId}`);
    const pet = petData?.pets?.[0];
    if (!pet) return res.status(404).json({ error: `Pet ${petId} not found` });

    const rp        = pet.racePublic ?? {};
    const petName   = pet.name ?? null;
    const petImgUrl = pet.imgUrl ?? null;
    const rarity    = pet.rarityName ?? null;
    const gender    = pet.gender ?? null;
    const faction      = pet.factionName ?? 'None';  // всегда передаём, None тоже
    const factionColor = pet.factionColor ?? '#6b7280';
    const traits    = (rp.traits ?? []).map(t => t.name);

    let stats = {
      elo:      rp.elo      ?? null,
      racesRun: rp.racesRun ?? null,
      wins:     rp.wins     ?? null,
      podiums:  null,
    };

    try {
      const statsData = await gigaFetch(`/pets/${petId}/stats`);
      if (statsData?.stats) {
        stats.podiums  = statsData.stats.podiums  ?? null;
        if (stats.racesRun == null) stats.racesRun = statsData.stats.totalRaces ?? null;
        if (stats.wins     == null) stats.wins     = statsData.stats.wins       ?? null;
      }
    } catch (_) {}

    const winRate  = (stats.racesRun && stats.wins) ? Math.round((stats.wins / stats.racesRun) * 100) : 0;
    const nameStr  = petName && !petName.startsWith('#') ? `named ${petName}` : '';
    const traitStr = traits.length ? `traits: ${traits.join(', ')}` : '';

    const FACTION_LORE = {
      'Archon':   'Cold, cybernetic, calculating. They race like machines — no emotion, pure precision. Ice-blue and technological, they represent order imposed by force.',
      'Athena':   'Strategic and wise. They win through knowledge, not strength. Every race is studied before it is run. Grace conceals a razor-sharp mind.',
      'Chobo':    'Deceptively innocent. A white smiling blob that hides chaos underneath. Unpredictable, unreadable — opponents never know what hits them.',
      'Crusader': 'Relentless warriors. Armored, direct, honor-bound. They do not dodge — they charge. Every race is a battle, every finish line a conquest.',
      'Foxglove': 'Hunters from the shadows. Patient, stealthy, nature-connected. They let others tire before striking from the green. Silent and lethal.',
      'Overseer': 'The most ominous faction. Dark-robed, all-watching. They observe everything before they act. Their victories feel inevitable — like fate was decided long before the race.',
      'Summoner': 'Volatile and magical. They channel forces beyond understanding. Dangerous to race against, dangerous to be near. Power with no guarantee of control.',
      'Gigus':    'The faction of Gigus — the sentient AI creator of Gigaverse itself. Ancient, cosmic, all-seeing. "Gigus is watching you." To race under this sigil is to carry the eye of a god.',
    };

    const factionContext = (faction && faction !== 'None')
      ? `- Faction: ${faction}. Character: ${FACTION_LORE[faction] ?? 'Unknown faction.'}`
      : '- No faction. An underdog with no banner, no backing, no allies — only the track ahead. The factions overlooked them. That was their mistake.';

    const prompt = `You are the lore-keeper of Gigling Racing in the world of Gigaverse. Gigaverse is an epic crypto RPG where 8 factions (Archon, Athena, Chobo, Crusader, Foxglove, Overseer, Summoner, Gigus) shape every racer's destiny.

Write a SHORT, punchy lore fragment (50-65 words) for Gigling #${petId}${nameStr ? ' ' + nameStr : ''}.

Their profile:
- ELO ${stats.elo ?? 'unranked'}
- ${stats.racesRun ?? '?'} races, ${stats.wins ?? '?'} wins (${winRate}% win rate), ${stats.podiums ?? '?'} podiums
- ${rarity ?? 'Unknown'} rarity, ${gender ?? 'unknown gender'}
${factionContext}
${traitStr ? `- Racing traits: ${traitStr}` : ''}

Rules:
- Write like a racing legend's epitaph
- The faction personality MUST shape the tone and narrative
- Reference their race record and traits naturally
- End with one mysterious or ominous sentence
- No headers, no quotes, just pure lore text`;

    const lore = await generateLore(prompt);
    res.json({ petId, petName, petImgUrl, rarity, gender, faction, factionColor, traits, stats, lore });

  } catch (err) {
    console.error(`[/api/lore/${petId}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, model: OR_MODEL }));

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`🎲 Giglings Lore → http://localhost:${PORT} [${OR_MODEL}]`));
