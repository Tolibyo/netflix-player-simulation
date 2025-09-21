import { describe, it, expect } from 'vitest';
import { add } from '../packages/player-sim/src/math';

describe('smoke', () => {
  it('1+1 equals 2', () => {
    expect(add(1,1)).toBe(2);
  });
});
