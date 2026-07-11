import type { Game } from '../types';
import { modules } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward } from '../rewards';

const ATTRS = modules.attrs;
const TRAIN_REQ = modules.trainReq;
type AttrKey = 'might' | 'agility' | 'wisdom' | 'spirit';

export function canTrain(g: Game, key: AttrKey): boolean {
  if (!g.settings.attrs) return false;
  const c = activeCard(g);
  if (!c || isFace(c)) return false;
  const a = ATTRS[key];
  if (activeSuit(g) !== a.suit) return false;
  const lvl = g.state.attrs[key];
  if (lvl >= 3) return false;
  return activeValue(g) >= TRAIN_REQ[lvl]!;
}

export function doTrain(g: Game, key: AttrKey): void {
  if (!canTrain(g, key)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const a = ATTRS[key];
  S.attrs[key]++;
  const lvl = S.attrs[key];
  log(S, 'You train ' + a.icon + ' ' + a.name + ' to level ' + lvl + ': ' + a.lv[lvl - 1], 'sys');
  if (key === 'might' && lvl === 3) gainReward(g, { glory: 2 }, 'Might mastery');
  if (key === 'agility' && lvl === 3) gainReward(g, { lore: 2 }, 'Agility mastery');
  if (key === 'wisdom' && lvl === 1) gainReward(g, { mana: 2 }, 'Wisdom training');
  if (key === 'wisdom' && lvl === 3) gainReward(g, { spirit: 2 }, 'Wisdom mastery');
  if (key === 'spirit' && lvl === 1) gainReward(g, { gold: 3 }, 'Spirit training');
  if (key === 'spirit' && lvl === 3) gainReward(g, { fortune: 2 }, 'Spirit mastery');
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const ATTR_KEYS: AttrKey[] = ['might', 'agility', 'wisdom', 'spirit'];
