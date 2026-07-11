// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { DomApp } from '../../src/render/dom/app';

// jsdom's CSS import is a no-op via vite; guard by mocking the import side effect.
describe('DOM renderer smoke test', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    host = document.getElementById('app')!;
  });

  function click(selector: string) {
    const el = host.querySelector<HTMLElement>(selector);
    if (!el) throw new Error('no element for ' + selector);
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  }

  it('renders the setup screen and can start a game', () => {
    const app = new DomApp();
    app.mount(host);
    expect(host.textContent).toContain('Flip Dungeon');
    // start disabled until a class is picked
    expect(host.querySelector<HTMLButtonElement>('[data-act="start"]')!.disabled).toBe(true);
    click('[data-act="pick-class"][data-k="knight"]');
    expect(host.querySelector<HTMLButtonElement>('[data-act="start"]')!.disabled).toBe(false);
    click('[data-act="start"]');
    // game screen shows the topbar and omen row
    expect(host.textContent).toContain('Round 1/3');
    expect(host.querySelectorAll('[data-act="sel-row"]').length).toBe(4);
  });

  it('selects a card and reveals the active panel', () => {
    const app = new DomApp();
    app.mount(host);
    click('[data-act="pick-class"][data-k="knight"]');
    click('[data-act="start"]');
    click('[data-act="sel-row"][data-i="0"]');
    // active panel should now show either placement chips or event options
    const panel = host.querySelector('.active-panel')!;
    expect(panel.textContent).not.toContain('Select a card to act');
  });

  it('can end turns without throwing', () => {
    const app = new DomApp();
    app.mount(host);
    click('[data-act="pick-class"][data-k="bard"]');
    click('[data-act="start"]');
    for (let i = 0; i < 4; i++) click('[data-act="end-turn"]');
    // turn 5 end triggers the assault modal
    click('[data-act="end-turn"]');
    expect(host.querySelector('.overlay')).not.toBeNull();
  });

  it('renders alternate boards and module panels without throwing', () => {
    const app = new DomApp();
    app.mount(host);
    click('[data-act="pick-class"][data-k="druid"]');
    click('[data-act="pick-board"][data-s="S"][data-id="catacombs"]');
    click('[data-act="pick-board"][data-s="C"][data-id="thicket"]');
    click('[data-act="pick-board"][data-s="H"][data-id="oracle"]');
    click('[data-act="pick-board"][data-s="D"][data-id="gemcutter"]');
    click('[data-act="toggle-mod"][data-k="runes"]');
    click('[data-act="toggle-mod"][data-k="chess"]');
    click('[data-act="toggle-mod"][data-k="followers"]');
    click('[data-act="start"]');
    expect(host.textContent).toContain('Catacombs');
    expect(host.textContent).toContain("Tyrant's Gambit");
    expect(host.querySelector('.chessboard')).not.toBeNull();
    // module camp panel present (runes/followers/guild)
    expect(host.textContent).toContain('Runes');
    // select first row card — active panel appears
    click('[data-act="sel-row"][data-i="0"]');
    expect(host.querySelector('.active-panel')).not.toBeNull();
  });

  it('opens and closes the Chronicle', () => {
    const app = new DomApp();
    app.mount(host);
    click('[data-act="open-chronicle"]');
    expect(host.textContent).toContain('The Chronicle');
    click('[data-act="close-chronicle"]');
    expect(host.textContent).toContain('Choose your hero');
  });

  it('runs the Proving Grounds and shows a report', () => {
    const app = new DomApp();
    app.mount(host);
    click('[data-act="open-lab"]');
    expect(host.textContent).toContain('The Proving Grounds');
    // shrink the run to keep the test fast
    host.querySelector<HTMLInputElement>('#lab-n')!.value = '5';
    click('[data-act="run-lab"]');
    expect(host.textContent).toContain("Designer's Notes");
    expect(host.textContent).toContain('gambler');
  });
});
