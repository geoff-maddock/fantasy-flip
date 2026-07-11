import {
  activeBoards,
  allFreeActions,
  chessTargets,
  thicketLegalCells,
  type Game,
} from '../../engine';
import { dungeon, forest, temple, market, advanced, modules, SUITS } from '../../content';
import { icon } from '../assets';

const A = advanced;

const slot = (content: string | number, cls = '', title = '', data = '') =>
  `<div class="slot ${cls}" ${title ? `title="${title}"` : ''} ${data}>${content}</div>`;

// Render the progress view for every board currently in play.
export function renderActiveBoards(g: Game): string {
  return activeBoards(g)
    .map((b) => `<section class="panel board"><h3>${b.name}</h3>${boardView(g, b.id)}</section>`)
    .join('');
}

function boardView(g: Game, id: string): string {
  const S = g.state;
  switch (id) {
    case 'dungeon':
      return `<div class="rooms">${dungeon.rooms
        .map((r, i) => slot(icon(r.em) + `<span class="thr">${r.t}${r.thr}</span>`, `${i < S.dungeonNext ? 'done' : ''} ${i === S.dungeonNext ? 'cur' : ''}`, `${r.name} ${r.t === 'T' ? '≤' : '≥'}${r.thr}`))
        .join('')}</div>`;

    case 'catacombs':
      return `<div class="rooms">${A.catacombs.crypts
        .map((c, i) => slot(S.cata.visited[i] ? '✓' : icon(c.em), `${S.cata.visited[i] ? 'done' : ''} ${i === S.cata.pos ? 'cur' : ''}`))
        .join('')}</div>`;

    case 'warcamp': {
      const charges = allFreeActions(g).filter((x) => x.board === 'warcamp' && x.legal);
      return [0, 1]
        .map((i) => {
          const L = S.lines[i]!;
          const sum = L.vals.reduce((a, b) => a + b, 0);
          const canCharge = charges.some((x) => x.key === 'charge:' + i);
          return `<div class="linebox"><span class="note">Line ${i + 1} [${L.st}] sum ${sum}</span>
            <div class="rooms">${L.vals.map((v) => slot(v, 'done')).join('') || '<span class="note">—</span>'}</div>
            ${canCharge ? `<button class="chip place" data-act="charge" data-i="${i}">⚔ Charge (${sum})</button>` : ''}</div>`;
        })
        .join('');
    }

    case 'forest':
      return `<div class="trail">${forest.slots
        .map((sl, i) => slot(S.trail[i] != null ? String(S.trail[i]) : icon(sl.em), S.trail[i] != null ? 'done' : ''))
        .join('<span class="arrow">→</span>')}</div>`;

    case 'thicket': {
      const legal = S.fill ? thicketLegalCells(g) : [];
      return `<div class="grid4">${S.grid
        .map((filled, i) => {
          const canClick = legal.includes(i);
          return `<div class="cell ${filled ? 'done' : ''} ${canClick ? 'legal' : ''}" ${canClick ? `data-act="thicket-cell" data-i="${i}"` : ''}>${filled ? '🌿' : ''}</div>`;
        })
        .join('')}</div>${S.fill ? `<span class="note">clear ${S.fill.left} more touching cell(s)</span>` : ''}`;
    }

    case 'stones':
      return `<div class="rooms">${S.stones
        .map((col, k) => slot(col.length ? col.join('+') : `pair ${k + 1}`, col.length === 2 ? 'done' : ''))
        .join('')}</div>`;

    case 'temple':
      return (['sun', 'moon'] as const)
        .map((key) => {
          const al = temple.altars[key];
          const vals = S.altars[key];
          const boxes = al.boxes.map((_, i) => slot(vals[i] != null ? String(vals[i]) : '·', vals[i] != null ? 'done' : '')).join('');
          return `<div class="altar"><div class="altar-name">${al.name}</div><div class="altar-boxes">${boxes}</div><span class="note">sum ${vals.reduce((a, b) => a + b, 0)} · ⭐@${al.t2}/${al.t3}</span></div>`;
        })
        .join('');

    case 'road':
      return `<div class="trail">${A.road.shrines
        .map((sh, i) => slot(i <= S.roadPos ? '✓' : icon(sh.em) + `<span class="thr">${sh.v}</span>`, i <= S.roadPos ? 'done' : ''))
        .join('<span class="arrow">→</span>')}</div>`;

    case 'oracle':
      return `<div class="rooms">${[0, 1, 2, 3]
        .map((i) => {
          const s = S.oracle.slots[i];
          return slot(s ? (s.hit ? '👁✓' : '✗') : '?', s ? (s.hit ? 'done' : '') : '');
        })
        .join('')}</div>${S.oracle.pending ? `<span class="note">prophecy pending: ${S.oracle.pending.guess === 'hi' ? 'higher' : 'lower'} than ${S.oracle.pending.v}</span>` : ''}`;

    case 'market':
      return `<div class="rooms">${market.items
        .map((it) => slot(icon(it.em) + `<span class="thr">${it.price}</span>`, S.items[it.name] ? 'done' : '', it.desc))
        .join('')}</div>`;

    case 'gemcutter':
      return (['emerald', 'ruby', 'diamond'] as const)
        .map((k) => {
          const gem = A.gemcutter.gems[k];
          const vals = S.gems[k];
          return `<div class="linebox"><span class="note">${gem.em} ${gem.name} — ${gem.hint}</span><div class="rooms">${[0, 1, 2].map((i) => slot(vals[i] != null ? String(vals[i]) : '·', vals[i] != null ? 'done' : '')).join('')}</div></div>`;
        })
        .join('');

    case 'traderoute':
      return `<div class="rooms">${A.traderoute.towns
        .map((t, i) => slot(t.n, S.routes.towns[i] ? 'done' : ''))
        .join('')}</div><span class="note">${S.routes.towns.filter(Boolean).length} towns joined</span>`;

    case 'tower':
      return `<div class="rooms">${A.tower.floors
        .map((_, i) => slot(S.tower[i] != null ? String(S.tower[i]) : 'floor ' + (i + 1), S.tower[i] != null ? 'done' : ''))
        .reverse()
        .join('')}</div>`;

    case 'bog':
      return `<div class="rooms">${S.pens
        .map((pen, i) => slot(pen.length ? pen.join('/') : A.bog.emoji[i]!, pen.length === 2 ? 'done' : ''))
        .join('')}</div>`;

    case 'tavern':
      return `<div class="rooms">${A.tavern.boxes
        .map((_, i) => slot(S.run[i] != null ? String(S.run[i]) : '·', S.run[i] != null ? 'done' : ''))
        .join('')}</div><span class="note">run: ${[...S.run].sort((a, b) => a - b).join('-') || '—'}</span>`;

    case 'chess': {
      const targets = chessTargets(g);
      const rows: string[] = [];
      for (let r = 0; r < 5; r++) {
        let cells = '';
        for (let c = 0; c < 5; c++) {
          const isChamp = S.chess.champ[0] === r && S.chess.champ[1] === c;
          const piece = S.chess.pieces.find((p) => p.alive && p.r === r && p.c === c);
          const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
          const glyph = isChamp ? '🛡' : piece ? modules.chess.glyph[piece.t] : '';
          cells += `<div class="cell ${isChamp ? 'champ' : ''} ${isTarget ? 'legal' : ''}" ${isTarget ? `data-act="chess-move" data-r="${r}" data-c="${c}"` : ''}>${glyph}</div>`;
        }
        rows.push(`<div class="chessrow">${cells}</div>`);
      }
      return `<div class="chessboard">${rows.join('')}</div><span class="note">♠rook ♥bishop ♦queen ♣knight</span>`;
    }

    default:
      return '<span class="note">—</span>';
  }
}

export const SUIT_SYM = SUITS;
