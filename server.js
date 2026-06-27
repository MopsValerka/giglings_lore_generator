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

    // ── 1. Сначала генерируем имя ────────────────────────────────────────
    const namePrompt = `Generate a creative, fun nickname (2-3 words MAX) for a Gigling racing character in Gigaverse.

Their profile:
- ELO ${stats.elo ?? 'unranked'} (${(stats.elo ?? 1000) >= 1400 ? 'strong competitor' : (stats.elo ?? 1000) >= 1200 ? 'average racer' : 'underdog'})
- ${stats.racesRun ?? '?'} races, ${stats.wins ?? '?'} wins, ${stats.podiums ?? '?'} podiums
- ${rarity ?? 'Unknown'} rarity, ${gender ?? 'unknown'}
- Faction: ${faction && faction !== 'None' ? faction : 'None (lone wolf)'}
${traitStr ? `- Traits: ${traitStr}` : ''}

Rules:
- Reference pop culture: movies, anime, games, memes, sports legends, music, TV shows
- Match their personality and stats (high wins = legendary feel, underdog = scrappy feel, Clutch trait = comeback king, etc.)
- Be creative and fun, avoid generic fantasy names
- 2-3 words MAXIMUM
- Return ONLY the name, nothing else, no explanation`;

    const generatedName = await generateLore(namePrompt);

    // ── 2. Потом лор — уже знает имя ─────────────────────────────────────
    const lorePrompt = prompt
      .replace(
        'Write a SHORT, punchy lore fragment',
        "The Gigling's name is '" + generatedName + '". Write a SHORT, punchy lore fragment'
      )
      .replace(
        '- No headers, no quotes, just pure lore text',
        '- Refer to this Gigling by their name "' + generatedName + '", not by number\n- No headers, no quotes, just pure lore text'
      );

    const lore = await generateLore(lorePrompt);

    res.json({ petId, petName, petImgUrl, rarity, gender, faction, factionColor, traits, stats, lore, generatedName });

  } catch (err) {
    console.error(`[/api/lore/${petId}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Upstash Redis ─────────────────────────────────────────────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

async function redisCmd(...args) {
  if (!REDIS_URL) { console.log('[Redis] No URL configured'); return null; }
  console.log(`[Redis] calling ${REDIS_URL} cmd=${args[0]}`);
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await r.json();
  console.log(`[Redis] ${args[0]} result:`, JSON.stringify(data).slice(0, 200));
  return data.result;
}

async function redisGet(key) {
  const result = await redisCmd('GET', key);
  return result ? JSON.parse(result) : null;
}

async function redisSet(key, value) {
  await redisCmd('SET', key, JSON.stringify(value));
}

// GET /api/inscriptions — все инскрипции
app.get('/api/inscriptions', async (req, res) => {
  try {
    const inscriptions = await redisGet('inscriptions') || [];
    res.json({ inscriptions });
  } catch (e) {
    res.json({ inscriptions: [] });
  }
});

// POST /api/inscriptions — добавить новую
app.post('/api/inscriptions', async (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) return res.status(400).json({ error: 'Invalid inscription' });
    const current = await redisGet('inscriptions') || [];
    const updated = [item, ...current].slice(0, 1000); // макс 100
    await redisSet('inscriptions', updated);
    res.json({ ok: true });
  } catch (e) {
    console.error('Redis error:', e.message, e.cause?.message || e.cause || '');
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, model: OR_MODEL }));

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`🎲 Giglings Lore → http://localhost:${PORT} [${OR_MODEL}]`));
