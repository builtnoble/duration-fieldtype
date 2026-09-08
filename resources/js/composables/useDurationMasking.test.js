import { describe, expect, it, vi } from 'vitest';
import { useDurationMasking } from './useDurationMasking';

const buildMasking = (meta = {}, callbacks = {}) => useDurationMasking(meta, callbacks);

const buildKeydownEvent = (key, value, caret = value.length) => ({
    key,
    target: { value, selectionStart: caret, setSelectionRange: vi.fn() },
    preventDefault: vi.fn(),
});

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

describe('handleKeyDown: steps whichever segment the caret is in on ArrowUp/ArrowDown', () => {
    it('increments minutes on ArrowUp when the caret is in the minutes segment', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowUp', '02:59', 4));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0300');
    });

    it('decrements minutes on ArrowDown when the caret is in the minutes segment', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowDown', '03:00', 4));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0259');
    });

    it('increments hours on ArrowUp when the caret is in the hours segment, leaving minutes alone', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowUp', '02:59', 1));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0359');
    });

    it('decrements hours on ArrowDown when the caret is in the hours segment, leaving minutes alone', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowDown', '03:59', 1));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0259');
    });

    it('treats a caret sitting on the separator as still within the hours segment', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowUp', '02:59', 2));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0359');
    });

    it('caps hours at the field maximum without rolling minutes over', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowUp', '99:59', 1));

        expect(onUnmaskedValue).toHaveBeenCalledWith('9959');
    });

    it('floors hours at zero', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowDown', '00:30', 1));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0030');
    });

    it('caps minutes stepping at the field maximum duration', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowUp', '99:59', 4));

        expect(onUnmaskedValue).toHaveBeenCalledWith('9959');
    });

    it('floors minutes stepping at zero', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('ArrowDown', '00:00', 4));

        expect(onUnmaskedValue).toHaveBeenCalledWith('0000');
    });

    it('prevents the default browser behavior for arrow keys', () => {
        const event = buildKeydownEvent('ArrowUp', '00:00', 4);
        const { handleKeyDown } = buildMasking();

        handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ignores keys other than ArrowUp/ArrowDown', () => {
        const onUnmaskedValue = vi.fn();
        const { handleKeyDown } = buildMasking({}, { onUnmaskedValue });

        handleKeyDown(buildKeydownEvent('Enter', '01:30', 4));

        expect(onUnmaskedValue).not.toHaveBeenCalled();
    });

    it('restores the caret to its original position so repeated stepping stays on the same segment', () => {
        const { handleKeyDown } = buildMasking();
        const event = buildKeydownEvent('ArrowUp', '02:59', 1);

        handleKeyDown(event);

        expect(event.target.setSelectionRange).toHaveBeenCalledWith(1, 1);
    });
});
