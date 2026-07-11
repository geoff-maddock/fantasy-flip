// Physical-component export. Generates a print-ready HTML sheet of blank,
// dry-erase-style board templates + a player dashboard, built from the SAME
// content data the digital game uses — so the printable and digital layouts stay
// in lockstep. `buildPrintHTML` is pure (testable); `printComponents` opens it.
import { dungeon, forest, temple, market, advanced, SUITS, type Suit } from '../content';

const box = (label = '', cls = '') => `<div class="p-slot ${cls}">${label}</div>`;
const tickRow = (n: number) => `<div class="p-track">${Array.from({ length: n }, () => '<span class="p-tick"></span>').join('')}</div>`;

function boardTemplate(id: string): string {
  switch (id) {
    case 'dungeon':
      return `<div class="p-row">${dungeon.rooms.map((r) => box(`${r.em}<br>${r.t === 'T' ? '≤' : '≥'}${r.thr}`)).join('')}</div>`;
    case 'catacombs':
      return `<div class="p-row">${advanced.catacombs.crypts.map((c, i) => box(`${c.em}<br>${i + 1}`)).join('')}</div>`;
    case 'warcamp':
      return `${[1, 2].map((n) => `<div class="p-line">Line ${n} (12–18): ${[0, 0, 0, 0, 0].map(() => box()).join('')}</div>`).join('')}`;
    case 'forest':
      return `<div class="p-row">${forest.slots.map((s, i) => box(`${s.em}<br>${i + 1}`)).join('')}</div>`;
    case 'thicket':
      return `<div class="p-grid">${Array.from({ length: 16 }, () => box()).join('')}</div>`;
    case 'stones':
      return `<div class="p-row">${[1, 2, 3, 4].map((n) => box(`pair ${n}`)).join('')}</div>`;
    case 'temple':
      return (['sun', 'moon'] as const)
        .map((k) => `<div class="p-line">${temple.altars[k].name}: ${temple.altars[k].boxes.map(() => box()).join('')}</div>`)
        .join('');
    case 'road':
      return `<div class="p-row">${advanced.road.shrines.map((s) => box(`${s.em}<br>${s.v}`)).join('')}</div>`;
    case 'oracle':
      return `<div class="p-row">${[1, 2, 3, 4].map((n) => box(`prophecy ${n}`)).join('')}</div>`;
    case 'market':
      return `<div class="p-row">${market.items.map((it) => box(`${it.em}<br>${it.name} (${it.price})`)).join('')}</div>`;
    case 'gemcutter':
      return (['emerald', 'ruby', 'diamond'] as const)
        .map((k) => `<div class="p-line">${advanced.gemcutter.gems[k].em} ${advanced.gemcutter.gems[k].name}: ${[0, 0, 0].map(() => box()).join('')}</div>`)
        .join('');
    case 'traderoute':
      return `<div class="p-row">${advanced.traderoute.towns.map((t) => box(t.n)).join('')}</div>`;
    default:
      return '<div class="p-row">' + box() + box() + box() + '</div>';
  }
}

function boardName(id: string): string {
  const all = [dungeon, forest, temple, market] as Array<{ id: string; name: string }>;
  const found = all.find((b) => b.id === id);
  if (found) return found.name;
  const adv = (advanced as unknown as Record<string, { id?: string; name?: string }>)[id];
  return adv?.name ?? id;
}

// Build the full printable component sheet for the chosen board layout.
export function buildPrintHTML(boards: Record<Suit, string>): string {
  const suitBoards = (['S', 'C', 'H', 'D'] as Suit[])
    .map((s) => `<section class="p-board"><h2>${SUITS[s].sym} ${boardName(boards[s])}</h2>${boardTemplate(boards[s])}</section>`)
    .join('');

  const dashboard = `<section class="p-board"><h2>Adventurer</h2>
    <div class="p-line">Hero: ${box()} &nbsp; Class: ${box()}</div>
    <div class="p-line">🪙 Gold ${box()} &nbsp; 🔮 Mana ${box()} &nbsp; ✦ XP ${box()} &nbsp; 🩸 Wounds ${box()} &nbsp; 🛡 Defense ${box()}</div>
    <div class="p-line">⭐ Glory ${tickRow(12)}</div>
    <div class="p-line">⭐ Lore ${tickRow(12)}</div>
    <div class="p-line">⭐ Spirit ${tickRow(12)}</div>
    <div class="p-line">⭐ Fortune ${tickRow(12)}</div>
    <div class="p-line">🔥 Threat ${tickRow(16)}</div>
  </section>`;

  const reference = `<section class="p-board"><h2>Quick Reference</h2>
    <p>3 rounds × 5 turns. Flip 4 omens, draft 2/turn. Leftover face cards raise Threat → Monster Assault each round's end.</p>
    <p>Jack = +3 gold / draw 2 · Queen = +2 mana / heal 2 / enchant · King = +1 XP −1 Threat / guard / +2 XP · Ace = 1 or 11, +1 XP.</p>
    <p>Score = (Glory + Lore + Spirit + Fortune) × 2 + XP − Wounds×2. Every 6 gold = 1 Fortune ⭐.</p>
  </section>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Flip Dungeon — Components</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; }
    h1 { text-align: center; }
    .p-board { border: 2px solid #333; border-radius: 8px; padding: 10px 14px; margin: 10px 0; break-inside: avoid; }
    .p-board h2 { margin: 0 0 8px; font-size: 1.1rem; border-bottom: 1px solid #999; }
    .p-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .p-line { margin: 6px 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .p-grid { display: grid; grid-template-columns: repeat(4, 46px); gap: 5px; }
    .p-slot { min-width: 46px; height: 46px; border: 1px solid #333; border-radius: 5px; display: flex;
      align-items: center; justify-content: center; text-align: center; font-size: 0.7rem; padding: 2px; }
    .p-track { display: inline-flex; gap: 3px; }
    .p-tick { width: 16px; height: 16px; border: 1px solid #333; border-radius: 3px; display: inline-block; }
    @media print { button { display: none; } }
  </style></head>
  <body>
    <h1>Flip Dungeon — Printable Components</h1>
    <p style="text-align:center;color:#555;">Print, laminate or sleeve, and write with a dry-erase marker. Play with one standard 52-card deck.</p>
    ${dashboard}
    ${suitBoards}
    ${reference}
    <div style="text-align:center;margin-top:12px;"><button onclick="window.print()">🖨 Print</button></div>
  </body></html>`;
}

// Open the print sheet in a new window (browser only).
export function printComponents(boards: Record<Suit, string>): void {
  const html = buildPrintHTML(boards);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
