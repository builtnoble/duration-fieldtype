import { describe, expect, it, vi } from 'vitest';
import { useDurationMasking } from './useDurationMasking';

const buildMasking = (meta = {}, callbacks = {}) => useDurationMasking(meta, callbacks);

describe('bounds resolution: normalizes the configured max hours/minutes', () => {
    it('defaults to 99:59 when no meta is provided', () => {
        const { options } = buildMasking();

        expect(options.postProcess('999999')).toBe('99:59');
    });

    it('honors a custom maxHours/maxMinutes from preload()', () => {
        const { options } = buildMasking({ maxHours: 5, maxMinutes: 30 });

        expect(options.postProcess('999999')).toBe('05:30');
    });

    it('falls back to the default when a bound is not finite', () => {
        const { options } = buildMasking({ maxHours: 'not-a-number' });

        expect(options.postProcess('999999')).toBe('99:59');
    });
});

describe('preProcess: strips the current field value to raw digits', () => {
    it('strips a masked hh:mm value to its digits', () => {
        const { options } = buildMasking();

        expect(options.preProcess('01:30')).toBe('0130');
    });

    it('returns an empty string for empty input', () => {
        const { options } = buildMasking();

        expect(options.preProcess('')).toBe('');
    });
});

describe('postProcess: formats raw digits as a zero-padded hh:mm string', () => {
    it('returns an empty string for empty input', () => {
        const { options } = buildMasking();

        expect(options.postProcess('')).toBe('');
    });

    it('formats a full 4-digit value as hh:mm', () => {
        const { options } = buildMasking();

        expect(options.postProcess('0130')).toBe('01:30');
    });

    it('clamps an out-of-range value to the field maximum', () => {
        const { options } = buildMasking();

        expect(options.postProcess('9999')).toBe('99:59');
    });
});

describe('onMaska: emits deduplicated unmasked values', () => {
    it('calls onUnmaskedValue when the unmasked value changes', () => {
        const onUnmaskedValue = vi.fn();
        const { options } = buildMasking({}, { onUnmaskedValue });

        options.onMaska({ detail: { unmasked: '0130' } });

        expect(onUnmaskedValue).toHaveBeenCalledWith('0130');
    });

    it('ignores duplicate events for the same unmasked value', () => {
        const onUnmaskedValue = vi.fn();
        const { options } = buildMasking({}, { onUnmaskedValue });

        options.onMaska({ detail: { unmasked: '0130' } });
        options.onMaska({ detail: { unmasked: '0130' } });

        expect(onUnmaskedValue).toHaveBeenCalledTimes(1);
    });

    it('emits again once the unmasked value changes', () => {
        const onUnmaskedValue = vi.fn();
        const { options } = buildMasking({}, { onUnmaskedValue });

        options.onMaska({ detail: { unmasked: '0130' } });
        options.onMaska({ detail: { unmasked: '0200' } });

        expect(onUnmaskedValue).toHaveBeenCalledTimes(2);
        expect(onUnmaskedValue).toHaveBeenLastCalledWith('0200');
    });

    it('accepts a flat detail shape in addition to a CustomEvent-like shape', () => {
        const onUnmaskedValue = vi.fn();
        const { options } = buildMasking({}, { onUnmaskedValue });

        options.onMaska({ unmasked: '0130' });

        expect(onUnmaskedValue).toHaveBeenCalledWith('0130');
    });

    it('does not throw when no onUnmaskedValue callback is provided', () => {
        const { options } = buildMasking();

        expect(() => options.onMaska({ detail: { unmasked: '0130' } })).not.toThrow();
    });
});

describe('bounds: exposes the resolved max hours/minutes for callers', () => {
    it('defaults to 99/59 when no meta is provided', () => {
        const { bounds } = buildMasking();

        expect(bounds).toEqual({ maxHours: 99, maxMinutes: 59 });
    });

    it('reflects a custom maxHours/maxMinutes from preload()', () => {
        const { bounds } = buildMasking({ maxHours: 5, maxMinutes: 30 });

        expect(bounds).toEqual({ maxHours: 5, maxMinutes: 30 });
    });
});
