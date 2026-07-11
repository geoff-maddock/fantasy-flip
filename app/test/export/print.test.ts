import { describe, it, expect } from 'vitest';
import { buildPrintHTML } from '../../src/export/printSheet';
import type { Suit } from '../../src/engine';

describe('printable components', () => {
  it('builds a component sheet for the core boards', () => {
    const boards = { S: 'dungeon', C: 'forest', H: 'temple', D: 'market' } as Record<Suit, string>;
    const html = buildPrintHTML(boards);
    expect(html).toContain('Printable Components');
    expect(html).toContain('The Dungeon');
    expect(html).toContain('The Wildwood');
    expect(html).toContain('The Twin Temple');
    expect(html).toContain('The Market');
    // player dashboard scoring tracks present
    expect(html).toContain('Glory');
    expect(html).toContain('window.print()');
  });

  it('builds templates for alternate boards too', () => {
    const boards = { S: 'catacombs', C: 'thicket', H: 'oracle', D: 'gemcutter' } as Record<Suit, string>;
    const html = buildPrintHTML(boards);
    expect(html).toContain('Catacombs of the Nameless');
    expect(html).toContain('The Deep Thicket');
    expect(html).toContain('The Veiled Oracle');
    expect(html).toContain("The Gemcutter's Bench");
  });
});
