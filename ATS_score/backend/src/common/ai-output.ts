// Helpers that turn whatever the AI returned into a predictable shape before it is saved or sent to the website.
// A model can return a wrong type, a missing field or far too much text, so nothing it says is trusted as-is.

export type Obj = Record<string, unknown>;

/** The value if it is text (cut to `max` characters), otherwise an empty string. */
export const asText = (v: unknown, max = Infinity): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** The text items of a list, each optionally cut to `maxLength`, keeping at most `maxItems`. Anything else gives []. */
export const asStrings = (v: unknown, opts: { maxItems?: number; maxLength?: number } = {}): string[] => {
  if (!Array.isArray(v)) return [];
  const { maxItems = Infinity, maxLength = Infinity } = opts;
  return v.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, maxLength)).slice(0, maxItems);
};

/** The object items of a list. Anything else gives []. */
export const asObjects = (v: unknown): Obj[] =>
  Array.isArray(v) ? v.filter((x): x is Obj => !!x && typeof x === 'object') : [];
