import { asObjects, asStrings, asText } from '../common/ai-output';

// The three AI-output services (mock interview, STAR stories, battle card) share these helpers.
// These tests pin the exact behaviour each of them relied on when it had its own copy.

describe('asText', () => {
  it('returns text unchanged, or cut to the limit', () => {
    expect(asText('hello')).toBe('hello');
    expect(asText('hello', 3)).toBe('hel');
  });
  it('turns anything that is not text into an empty string', () => {
    for (const v of [undefined, null, 5, true, {}, ['a']]) expect(asText(v)).toBe('');
  });
});

describe('asStrings', () => {
  it('keeps only the text items, in order', () => {
    expect(asStrings(['a', 1, null, 'b', {}, 'c'])).toEqual(['a', 'b', 'c']);
  });
  it('cuts each item to maxLength and keeps at most maxItems (mock interview: 8 items; STAR: 10 items of a set length)', () => {
    expect(asStrings(Array.from({ length: 12 }, (_, i) => `item${i}`), { maxItems: 8 })).toHaveLength(8);
    expect(asStrings(['abcdef', 'xy'], { maxLength: 3, maxItems: 10 })).toEqual(['abc', 'xy']);
    // the limit counts the items that are kept, not the ones that were skipped
    expect(asStrings([1, 2, 'a', 'b', 'c'], { maxItems: 2 })).toEqual(['a', 'b']);
  });
  it('has no limits unless asked (battle card)', () => {
    const many = Array.from({ length: 50 }, (_, i) => 'x'.repeat(500) + i);
    const out = asStrings(many);
    expect(out).toHaveLength(50);
    expect(out[0]).toHaveLength(501);   // not cut
  });
  it('gives [] for anything that is not a list', () => {
    for (const v of [undefined, null, 'text', 3, {}, { length: 2 }]) expect(asStrings(v)).toEqual([]);
  });
});

describe('asObjects', () => {
  it('keeps only the object items', () => {
    expect(asObjects([{ a: 1 }, 'x', 2, null, { b: 2 }, undefined])).toEqual([{ a: 1 }, { b: 2 }]);
  });
  it('gives [] for anything that is not a list', () => {
    for (const v of [undefined, null, 'text', 3, { a: 1 }]) expect(asObjects(v)).toEqual([]);
  });
});
