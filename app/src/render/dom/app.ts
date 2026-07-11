import type { Renderer } from '../Renderer';
import {
  createGame,
  defaultSettings,
  startGame,
  selectRow,
  selectHand,
  modVal,
  modSuit,
  setAceMode,
  campCard,
  playEvent,
  useAbility,
  activeCard,
  activeValue,
  activeSuit,
  totalDefense,
  isFace,
  allTargets,
  endTurn,
  lastStandFlip,
  resolveAssaultNow,
  closeAssault,
  finalScore,
  delveFlip,
  delveBank,
  isGameOver,
  unlockLoc,
  unlockCost,
  fillThicketCell,
  doChessMove,
  chargeLine,
  beginSpell,
  cancelSpell,
  canTrain,
  doTrain,
  spendFollower,
  usePower,
  runeCharges,
  SPELLS,
  ATTR_KEYS,
  FOLLOWER_KEYS,
  type Game,
  type Settings,
  type Card,
  type EventChoice,
  type Suit,
} from '../../engine';
import {
  classes,
  difficulties,
  modules,
  runes as RUNES,
  rankLabel,
  SUITS,
  FACE_EMOJI,
  LOCS,
  type ClassId,
  type DifficultyId,
  type RuneType,
} from '../../content';
import { renderActiveBoards } from './boards';
import { setupBoardPicker, MODULE_DEFS } from './setup';
import { runLab, labStat, type LabConfig, type LabReport } from '../../bots';
import { printComponents } from '../../export/printSheet';
import {
  saveGame,
  resumeGame,
  hasSavedGame,
  recordGame,
  history,
  exportChronicle,
  clearHistory,
} from '../../persist/chronicle';

const suitClass = (s: Suit) => (SUITS[s].red ? 'red' : '');
const now = () => Date.now();

function cardHTML(c: Card, cls = ''): string {
  const s = SUITS[c.suit];
  const faceTag = isFace(c)
    ? `<div class="face-tag">${c.rank === 11 ? 'gold / cards' : c.rank === 12 ? 'mana / heal / enchant' : 'rally / guard / decree'}</div>`
    : c.rank === 1
      ? `<div class="face-tag">plays 1 or 11</div>`
      : '';
  const big = isFace(c) || c.rank === 1 ? `<span class="fc">${FACE_EMOJI[c.rank] ?? ''}</span>${s.sym}` : s.sym;
  return `<div class="pcard ${suitClass(c.suit)} ${cls}">
    <div class="corner">${rankLabel(c.rank)}<br>${s.sym}</div>
    <div class="big">${big}</div>${faceTag}
    <div class="corner bot">${rankLabel(c.rank)}<br>${s.sym}</div>
  </div>`;
}

export class DomApp implements Renderer {
  private host!: HTMLElement;
  private game: Game | null = null;
  private showChronicle = false;
  private showLab = false;
  private labReport: LabReport | null = null;
  private labN = 50;
  private selClass: ClassId | null = null;
  private selDiff: DifficultyId = 'adventurer';
  private selBoards: Record<Suit, string> = { S: 'dungeon', C: 'forest', H: 'temple', D: 'market' };
  private selModules: Record<string, boolean> = {};

  mount(host: HTMLElement): void {
    this.host = host;
    this.host.addEventListener('click', (e) => this.onClick(e));
    this.update();
  }

  setGame(game: Game | null): void {
    this.game = game;
    this.update();
  }

  update(): void {
    if (!this.host) return;
    if (this.showLab) this.host.innerHTML = this.renderLab();
    else if (this.showChronicle) this.host.innerHTML = this.renderChronicle();
    else this.host.innerHTML = this.game ? this.renderGame(this.game) : this.renderSetup();
  }

  // The Proving Grounds — run the bot harness on the chosen boards/modules.
  private renderLab(): string {
    const rep = this.labReport;
    let results = '<p class="note center">Runs 5 bot strategies through complete games on your selected boards + modules, then reports the balance.</p>';
    if (rep) {
      const strats = Object.entries(rep.strategies)
        .map(([k, M]) => ({ k, s: labStat(M.totals) }))
        .sort((a, b) => b.s.avg - a.s.avg);
      const table = `<table class="scoretbl"><tr><th>Strategy</th><th>Avg</th><th>Med</th><th>Max</th></tr>${strats
        .map((r) => `<tr><td>${r.k}</td><td>${r.s.avg}</td><td>${r.s.med}</td><td>${r.s.max}</td></tr>`)
        .join('')}</table>`;
      const notes = `<div class="logbox" style="max-height:280px;">${rep.notes.map((n) => `<div class="${n.startsWith('⚠') ? 'log-bad' : 'log-lt'}">${n}</div>`).join('')}</div>`;
      results = `${table}<h3>Designer's Notes</h3>${notes}`;
    }
    return `<main class="setup"><h1>⚗ The Proving Grounds</h1>
      <div class="center">
        <label>Games per strategy <input type="number" id="lab-n" value="${this.labN}" min="5" max="500" style="width:90px;padding:5px;background:#14100b;color:var(--ink);border:1px solid var(--line);border-radius:6px;"></label>
        <button class="primary" data-act="run-lab">▶ Run</button>
      </div>
      ${results}
      <div class="center"><button data-act="close-lab">Close</button></div></main>`;
  }

  // ---------------- setup ----------------
  private renderSetup(): string {
    const classCards = (Object.entries(classes) as Array<[ClassId, (typeof classes)[ClassId]]>)
      .map(
        ([k, c]) => `<div class="pick ${this.selClass === k ? 'sel' : ''}" data-act="pick-class" data-k="${k}">
          <h3>${c.icon} ${c.name}</h3><div class="cp"><b>Passive:</b> ${c.passive}</div><div class="cp"><b>Ability:</b> ${c.active}</div>
        </div>`,
      )
      .join('');
    const diffCards = (Object.entries(difficulties) as Array<[DifficultyId, (typeof difficulties)[DifficultyId]]>)
      .map(([k, d]) => `<div class="pick ${this.selDiff === k ? 'sel' : ''}" data-act="pick-diff" data-k="${k}"><h3>${d.icon} ${d.name}</h3><div class="cp">${d.desc}</div></div>`)
      .join('');
    const mods = MODULE_DEFS.map(
      (m) => `<label class="modtoggle"><input type="checkbox" data-act="toggle-mod" data-k="${m.id}" ${this.selModules[m.id] ? 'checked' : ''}/> ${m.icon} ${m.name}<span class="note"> — ${m.desc}</span></label>`,
    ).join('');
    const resume = hasSavedGame() ? `<button class="primary big" data-act="resume">↻ Resume saved game</button>` : '';
    return `<main class="setup">
      <h1>Flip Dungeon</h1><p class="tagline">A flip-and-write fantasy adventure · solo playtest</p>
      <div class="center">${resume} <button data-act="open-chronicle">📜 The Chronicle</button> <button data-act="open-lab">⚗ Proving Grounds</button> <button data-act="print">🖨 Print components</button></div>
      <section><h2>Choose your hero</h2><div class="grid">${classCards}</div></section>
      <section><h2>Choose your boards</h2>${setupBoardPicker(this.selBoards)}</section>
      <section><h2>Difficulty</h2><div class="grid">${diffCards}</div></section>
      <section><h2>Experimental modules</h2><div class="modlist">${mods}</div></section>
      <div class="center"><button class="primary big" data-act="start" ${this.selClass ? '' : 'disabled'}>Begin the Adventure</button></div>
    </main>`;
  }

  private renderChronicle(): string {
    const h = history();
    const body = h.length
      ? `<table class="scoretbl"><tr><th>Date</th><th>Hero</th><th>Tier</th><th>Score</th></tr>${h
          .map((g) => `<tr><td>${new Date(g.ts).toLocaleString()}</td><td>${classes[g.cls as ClassId]?.icon ?? ''} ${g.cls}</td><td>${g.tier}</td><td>${g.total}</td></tr>`)
          .join('')}</table>
        <div class="center"><button data-act="export-chronicle">⬇ Export JSON</button> <button class="danger" data-act="clear-chronicle">Burn the Records</button></div>`
      : `<p class="note center">No completed games yet.</p>`;
    return `<main class="setup"><h1>📜 The Chronicle</h1>${body}<div class="center"><button class="primary" data-act="close-chronicle">Close</button></div></main>`;
  }

  // ---------------- game ----------------
  private renderGame(g: Game): string {
    const S = g.state;
    const cls = classes[S.cls]!;
    const pips = [1, 2, 3, 4, 5].map((t) => `<span class="pip ${t <= S.turn ? 'on' : ''}"></span>`).join('');
    const stars = S.glory + S.lore + S.spirit + S.fortune;
    const topbar = `<header class="topbar">
      <div class="tb-left"><b>Round ${S.round}/3</b> <span class="pips">${pips}</span></div>
      <div class="tb-stats">
        <span class="stat">🪙 ${S.gold}</span><span class="stat">🔮 ${S.mana}</span><span class="stat">✦ ${S.xp}</span>
        <span class="stat">🩸 ${S.wounds}</span><span class="stat">🛡 ${totalDefense(g)}</span>
        <span class="stat hot">🔥 ${(difficulties[g.settings.diff]!.base[String(S.round)] ?? 0) + S.threat}</span>
        <span class="stat">⭐ ${stars}</span>
      </div>
      <div class="tb-right">
        <button class="tiny ${S.abilityUsed ? '' : 'primary'}" data-act="ability" ${S.abilityUsed ? 'disabled' : ''} title="${cls.active}">${cls.icon} ${cls.name}</button>
        <button class="tiny" data-act="end-turn">End Turn ▸</button>
        <button class="tiny" data-act="quit">Quit</button>
      </div>
    </header>`;

    const row = S.row
      .map((slot, i) => {
        const sel = S.active && S.active.source === 'row' && S.active.idx === i ? 'selected' : '';
        return `<div class="cardwrap" data-act="sel-row" data-i="${i}">${cardHTML(slot.card, `${sel} ${slot.taken ? 'taken' : ''}`)}</div>`;
      })
      .join('');
    const hand = S.hand
      .map((c, i) => {
        const sel = S.active && S.active.source === 'hand' && S.active.idx === i ? 'selected' : '';
        return `<div class="cardwrap" data-act="sel-hand" data-i="${i}">${cardHTML(c, sel)}</div>`;
      })
      .join('');
    const logHtml = S.log.slice(0, 40).map((l) => `<div class="log-${l.cls}">${l.msg}</div>`).join('');

    return `<div class="game">${topbar}
      <div class="board-layout">
        <div class="left-rail">
          <section class="panel"><h3>Omen Row · ${S.draftsLeft} pick${S.draftsLeft === 1 ? '' : 's'} left</h3><div class="cardrow">${row}</div></section>
          ${S.spellMode ? `<section class="panel active-panel"><b>✨ Casting — choose a second card to burn.</b> <button class="chip" data-act="spell-cancel">Cancel</button></section>` : this.renderActivePanel(g)}
          ${this.renderModulePanel(g)}
          <section class="panel"><h3>Hero Hand</h3><div class="cardrow small">${hand || '<span class="note">empty</span>'}</div></section>
          <section class="panel log"><h3>Chronicle</h3><div class="logbox">${logHtml}</div></section>
        </div>
        <div class="right-rail">${renderActiveBoards(g)}</div>
      </div>
      ${this.renderModals(g)}
    </div>`;
  }

  private renderActivePanel(g: Game): string {
    const S = g.state;
    if (!S.active) return `<section class="panel active-panel"><span class="note">Select a card to act.</span></section>`;
    const c = activeCard(g)!;
    const v = activeValue(g);
    const su = activeSuit(g)!;
    let body = `<div class="active-head">Selected: ${cardHTML(c, 'mini')} → <b>${isFace(c) ? rankLabel(c.rank) : v}${SUITS[su].sym}</b></div>`;

    if (isFace(c)) {
      body += `<div class="btnrow">${this.eventOptions(c.rank).map((o) => `<button class="chip" data-act="event" data-c="${o.choice}">${o.label}</button>`).join('')}</div>`;
      return `<section class="panel active-panel">${body}</section>`;
    }

    body += `<div class="btnrow">
      <button class="chip" data-act="mod" data-d="-1">− value</button>
      <button class="chip" data-act="mod" data-d="1">+ value</button>
      ${c.rank === 1 ? `<button class="chip" data-act="ace" data-hi="1">Ace = 11</button><button class="chip" data-act="ace" data-hi="0">Ace = 1</button>` : ''}
    </div>`;
    body += `<div class="btnrow">${(['S', 'C', 'H', 'D'] as Suit[])
      .map((s) => `<button class="chip suit ${suitClass(s)} ${su === s ? 'on' : ''}" data-act="suit" data-s="${s}">${SUITS[s].sym}</button>`)
      .join('')}</div>`;

    const targets = allTargets(g).filter((t) => t.legal);
    body += `<div class="btnrow targets">${
      targets.length
        ? targets.map((t) => `<button class="chip place" data-act="place" data-b="${t.board}" data-key="${t.key}">${t.label}</button>`).join('')
        : '<span class="note">no legal placement — tweak, change suit, or camp</span>'
    }</div>`;

    // module actions that need the active card
    if (g.settings.attrs) {
      const trains = ATTR_KEYS.filter((k) => canTrain(g, k));
      if (trains.length) body += `<div class="btnrow">${trains.map((k) => `<button class="chip" data-act="train" data-k="${k}">Train ${modules.attrs[k].icon} ${modules.attrs[k].name}</button>`).join('')}</div>`;
    }
    if (g.settings.spells) {
      body += `<div class="btnrow">${SPELLS.filter((sp) => S.mana >= sp.mana).map((sp) => `<button class="chip" data-act="spell" data-id="${sp.id}" title="${sp.desc}">${sp.icon} ${sp.name}</button>`).join('')}</div>`;
    }
    body += `<div class="btnrow"><button class="chip" data-act="camp">⛺ Camp (+gold)</button></div>`;
    return `<section class="panel active-panel">${body}</section>`;
  }

  // Persistent panel for runes / followers / attributes / guild charters.
  private renderModulePanel(g: Game): string {
    const S = g.state;
    const parts: string[] = [];
    if (g.settings.runes) {
      const chips = (Object.keys(RUNES) as RuneType[])
        .map((t) => {
          const ch = runeCharges(g, t);
          const r = RUNES[t]!;
          return `<button class="chip ${ch > 0 ? 'place' : ''}" data-act="rune" data-t="${t}" ${ch > 0 ? '' : 'disabled'} title="${r.power}">${r.icon} ${S.runes[t]}${ch > 0 ? ` ·${ch}⚡` : ''}</button>`;
        })
        .join('');
      parts.push(`<div class="mod-line"><span class="note">Runes${S.confluences ? ` · ${S.confluences}✨` : ''}:</span> ${chips}</div>`);
    }
    if (g.settings.followers) {
      const chips = FOLLOWER_KEYS.filter((k) => S.followers[k] > 0)
        .map((k) => `<button class="chip place" data-act="follower" data-k="${k}" title="${modules.followers[k].desc}">${modules.followers[k].icon} ${modules.followers[k].name} ×${S.followers[k]}</button>`)
        .join('');
      parts.push(`<div class="mod-line"><span class="note">Followers:</span> ${chips || '<span class="note">none banked</span>'}</div>`);
    }
    if (g.settings.attrs) {
      const chips = ATTR_KEYS.map((k) => `<span class="chip">${modules.attrs[k].icon} ${modules.attrs[k].name} L${S.attrs[k]}</span>`).join('');
      parts.push(`<div class="mod-line"><span class="note">Attributes:</span> ${chips}</div>`);
    }
    // Guild charters
    const charters = (['tower', 'bog', 'tavern'] as const).filter((k) => !S.unlocked[k]);
    if (charters.length) {
      const cost = unlockCost(g);
      const chips = charters
        .map((k) => `<button class="chip ${S.xp >= cost ? 'place' : ''}" data-act="charter" data-k="${k}" ${S.xp >= cost ? '' : 'disabled'} title="${LOCS[k].blurb}">${LOCS[k].icon} ${LOCS[k].name} (${cost}✦)</button>`)
        .join('');
      parts.push(`<div class="mod-line"><span class="note">Adventurers' Guild:</span> ${chips}</div>`);
    }
    if (!parts.length) return '';
    return `<section class="panel"><h3>Camp</h3>${parts.join('')}</section>`;
  }

  private eventOptions(rank: number): Array<{ choice: EventChoice; label: string }> {
    if (rank === 11) return [{ choice: 'gold', label: '🪙 +3 gold' }, { choice: 'cards', label: '🃏 draw 2 hero' }];
    if (rank === 12) return [{ choice: 'mana', label: '🔮 +2 mana' }, { choice: 'enchant', label: '✨ +1 mana, free suit' }, { choice: 'heal', label: '🩸 heal 2' }];
    return [{ choice: 'threat', label: '✦ +1 XP, −1 threat' }, { choice: 'guard', label: '🛡 +1 guard' }, { choice: 'lore', label: '✦ +2 XP' }];
  }

  private renderModals(g: Game): string {
    const S = g.state;
    if (S.over) {
      const sc = finalScore(g);
      const rows = sc.rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1] >= 0 ? '+' : ''}${r[1]}</td></tr>`).join('');
      return `<div class="overlay"><div class="modal"><h1>${sc.total} points</h1><p class="tagline">“${sc.tier}”</p>
        <table class="scoretbl">${rows}<tr><td><b>Total</b></td><td><b>${sc.total}</b></td></tr></table>
        <div class="center"><button class="primary" data-act="new-game">New Game</button> <button data-act="open-chronicle">📜 Chronicle</button></div></div></div>`;
    }
    if (S.delve) {
      const d = S.delve;
      const flips = d.flips.map((c) => cardHTML(c, 'small')).join('') || '<span class="note">no cards flipped</span>';
      const controls = d.busted
        ? `<button class="primary" data-act="delve-bank">Limp away</button>`
        : `<button class="danger" data-act="delve-flip">🎲 Flip</button><button class="primary" data-act="delve-bank">💰 Bank & leave</button>`;
      return `<div class="overlay"><div class="modal"><h1>The Delve</h1>
        <p class="center note">Each red card banks ${d.depth} 🪙. A second black — or any black face — is an ambush.</p>
        <div class="cardrow center">${flips}</div>
        <p class="center">Unbanked: <b>${d.lootG} 🪙${d.lootM ? ' + ' + d.lootM + ' 🔮' : ''}</b> · Perils ${d.blacks}/2</p>
        <div class="center">${controls}</div></div></div>`;
    }
    if (S.assault) {
      const a = S.assault;
      const threat = a.base + a.bonusThreat;
      const def = a.def + a.bonusDef;
      const flips = a.flips.map((c) => cardHTML(c, 'small')).join('');
      let controls: string;
      if (!a.resolved) {
        controls = `<button class="danger" data-act="laststand">🎲 Last Stand flip</button><button class="primary" data-act="resolve-assault">⚔ Stand & resolve</button>`;
      } else {
        const msg = a.outcome!.win
          ? `<p class="center good">The line holds! +${(a.outcome as { g: number }).g}⭐ Glory, +1 XP.</p>`
          : `<p class="center bad">The monsters break through — ${(a.outcome as { w: number }).w} Wound(s).</p>`;
        controls = `${msg}<button class="primary" data-act="close-assault">${S.round === 3 ? 'Final Scoring' : 'Continue to Round ' + (S.round + 1)}</button>`;
      }
      return `<div class="overlay"><div class="modal"><h1>🔥 Monster Assault — Round ${S.round}</h1>
        <p class="center" style="font-size:1.15rem;">🔥 <b class="bad">${threat}</b> vs 🛡 <b class="good">${def}</b></p>
        <div class="cardrow center">${flips}</div><div class="center">${controls}</div></div></div>`;
    }
    return '';
  }

  // ---------------- dispatch ----------------
  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) return;
    const act = el.dataset.act!;

    // chronicle + setup
    if (act === 'open-chronicle') { this.showChronicle = true; return this.update(); }
    if (act === 'close-chronicle') { this.showChronicle = false; return this.update(); }
    if (act === 'open-lab') { this.showLab = true; return this.update(); }
    if (act === 'close-lab') { this.showLab = false; return this.update(); }
    if (act === 'run-lab') return this.runProvingGrounds();
    if (act === 'print') return printComponents(this.selBoards);
    if (act === 'export-chronicle') return exportChronicle();
    if (act === 'clear-chronicle') { if (confirm('Erase all recorded games?')) clearHistory(); return this.update(); }
    if (act === 'pick-class') { this.selClass = el.dataset.k as ClassId; return this.update(); }
    if (act === 'pick-diff') { this.selDiff = el.dataset.k as DifficultyId; return this.update(); }
    if (act === 'pick-board') { this.selBoards[el.dataset.s as Suit] = el.dataset.id!; return this.update(); }
    if (act === 'toggle-mod') { const k = el.dataset.k!; this.selModules[k] = !this.selModules[k]; return; }
    if (act === 'start') return this.startNewGame();
    if (act === 'resume') { const g = resumeGame(); if (g) { this.game = g; } return this.update(); }
    if (act === 'new-game') { this.game = null; this.selClass = null; return this.update(); }

    const g = this.game;
    if (!g) return;
    switch (act) {
      case 'sel-row': selectRow(g, Number(el.dataset.i)); break;
      case 'sel-hand': selectHand(g, Number(el.dataset.i)); break;
      case 'mod': modVal(g, Number(el.dataset.d)); break;
      case 'suit': modSuit(g, el.dataset.s as Suit); break;
      case 'ace': setAceMode(g, el.dataset.hi === '1'); break;
      case 'camp': campCard(g); break;
      case 'event': playEvent(g, el.dataset.c as EventChoice); break;
      case 'ability': useAbility(g); break;
      case 'place': { const t = allTargets(g).find((x) => x.board === el.dataset.b && x.key === el.dataset.key); if (t?.legal) t.apply(g); break; }
      case 'charge': chargeLine(g, Number(el.dataset.i)); break;
      case 'thicket-cell': fillThicketCell(g, Number(el.dataset.i)); break;
      case 'chess-move': doChessMove(g, Number(el.dataset.r), Number(el.dataset.c)); break;
      case 'train': doTrain(g, el.dataset.k as (typeof ATTR_KEYS)[number]); break;
      case 'spell': beginSpell(g, el.dataset.id!); break;
      case 'spell-cancel': cancelSpell(g); break;
      case 'follower': spendFollower(g, el.dataset.k as (typeof FOLLOWER_KEYS)[number]); break;
      case 'rune': usePower(g, el.dataset.t as RuneType); break;
      case 'charter': unlockLoc(g, el.dataset.k as 'tower' | 'bog' | 'tavern'); break;
      case 'end-turn': endTurn(g); break;
      case 'laststand': lastStandFlip(g); break;
      case 'resolve-assault': resolveAssaultNow(g); break;
      case 'close-assault': closeAssault(g); break;
      case 'delve-flip': delveFlip(g); break;
      case 'delve-bank': delveBank(g); break;
      case 'quit': if (confirm('Quit to the title screen? Your game is saved.')) { saveGame(g); this.game = null; this.selClass = null; } break;
    }
    // persist: record finished games, otherwise autosave the in-progress one
    if (isGameOver(g)) recordGame(g, now());
    else saveGame(g);
    this.update();
  }

  private runProvingGrounds(): void {
    const input = this.host.querySelector<HTMLInputElement>('#lab-n');
    if (input) this.labN = Math.max(5, Math.min(500, Number(input.value) || 50));
    const base: Settings = {
      ...defaultSettings(),
      boards: { ...this.selBoards },
      attrs: !!this.selModules['attrs'],
      followers: !!this.selModules['followers'],
      spells: !!this.selModules['spells'],
      pyl: !!this.selModules['pyl'],
      chess: !!this.selModules['chess'],
      runes: !!this.selModules['runes'],
    };
    const cfg: LabConfig = {
      n: this.labN,
      cls: this.selClass ?? 'all',
      diff: this.selDiff,
      strats: ['random', 'greedy', 'specialist', 'defensive', 'gambler'],
      mods: 'chosen',
      base,
      boardsMode: 'fixed',
      seed: 1,
    };
    this.labReport = runLab(cfg);
    this.update();
  }

  private startNewGame(): void {
    if (!this.selClass) return;
    const settings: Settings = {
      ...defaultSettings(),
      diff: this.selDiff,
      boards: { ...this.selBoards },
      attrs: !!this.selModules['attrs'],
      followers: !!this.selModules['followers'],
      spells: !!this.selModules['spells'],
      pyl: !!this.selModules['pyl'],
      chess: !!this.selModules['chess'],
      runes: !!this.selModules['runes'],
    };
    const g = createGame({ cls: this.selClass, settings });
    startGame(g);
    this.game = g;
    saveGame(g);
    this.update();
  }
}
