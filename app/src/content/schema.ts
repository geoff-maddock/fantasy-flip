import { z } from 'zod';

// A Reward is a bundle of resource/score gains granted by a board space, event, etc.
// Every key is optional; the engine applies whichever are present. Kept as a flat
// record so board content stays declarative (no logic lives in the data files).
export const RewardSchema = z
  .object({
    gold: z.number().int(),
    mana: z.number().int(),
    xp: z.number().int(),
    glory: z.number().int(),
    lore: z.number().int(),
    spirit: z.number().int(),
    fortune: z.number().int(),
    def: z.number().int(),
    heal: z.number().int(),
  })
  .partial()
  .strict();
export type Reward = z.infer<typeof RewardSchema>;

// A rune spot maps a board slot index -> elemental rune type (Phase 2 module).
export const RuneType = z.enum(['ember', 'tide', 'gale', 'stone']);
export type RuneType = z.infer<typeof RuneType>;

/* ---------- Dungeon ---------- */
export const DungeonRoomSchema = z.object({
  t: z.enum(['F', 'T', 'B']), // Fight / Trap / Boss
  thr: z.number().int(), // threshold
  d: z.number().int(), // depth
  name: z.string(),
  em: z.string(), // emoji (fallback art key)
  rw: RewardSchema,
});
export type DungeonRoom = z.infer<typeof DungeonRoomSchema>;

/* ---------- Forest ---------- */
export const ForestSlotSchema = z.object({ em: z.string(), rw: RewardSchema });
export type ForestSlot = z.infer<typeof ForestSlotSchema>;

/* ---------- Temple ---------- */
export const AltarSchema = z.object({
  name: z.string(),
  parity: z.union([z.literal(0), z.literal(1)]),
  boxes: z.array(RewardSchema),
  t3: z.number().int(),
  t2: z.number().int(),
});
export type Altar = z.infer<typeof AltarSchema>;

/* ---------- Market ---------- */
export const ItemSchema = z.object({
  name: z.string(),
  em: z.string(),
  price: z.number().int(),
  desc: z.string(),
});
export type Item = z.infer<typeof ItemSchema>;

/* ---------- Classes ---------- */
export const ClassSchema = z.object({
  icon: z.string(),
  name: z.string(),
  passive: z.string(),
  active: z.string(),
});
export type ClassDef = z.infer<typeof ClassSchema>;

/* ---------- Difficulty ---------- */
export const DifficultySchema = z.object({
  icon: z.string(),
  name: z.string(),
  desc: z.string(),
  base: z.record(z.string(), z.number().int()), // round -> base threat
  gold: z.number().int(),
  mana: z.number().int(),
  wcap: z.number().int(),
});
export type Difficulty = z.infer<typeof DifficultySchema>;

/* ---------- Board pool metadata ---------- */
export const BoardMetaSchema = z.object({
  id: z.string(),
  svg: z.string(),
  name: z.string(),
  mech: z.string(),
});
export type BoardMeta = z.infer<typeof BoardMetaSchema>;

export function validate<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const res = schema.safeParse(data);
  if (!res.success) {
    throw new Error(`Invalid content for ${label}: ${res.error.message}`);
  }
  return res.data;
}
