import { describe, expect, it } from 'vitest';
import {
    formatHourMinute,
    normalizeToHourMinute,
    resolveDurationDigit,
    sanitizeDigits,
    stepDurationDigit,
} from './durationParsing';

const bounds = { maxHours: 99, maxMinutes: 59 };

describe('sanitizeDigits: strips to a plain digit string', () => {
    it('strips a masked hh:mm value to its digits', () => {
        expect(sanitizeDigits('01:30')).toBe('0130');
    });

    it('returns an empty string for empty input', () => {
        expect(sanitizeDigits('')).toBe('');
    });

    it('returns an empty string for null input', () => {
        expect(sanitizeDigits(null)).toBe('');
    });
});

describe('normalizeToHourMinute: parses digits into clamped hour/minute parts', () => {
    it('reports no value for empty input', () => {
        expect(normalizeToHourMinute('', bounds)).toEqual({ hours: 0, minutes: 0, hasValue: false });
    });

    it('left-pads a partial digit string as minutes', () => {
        expect(normalizeToHourMinute('30', bounds)).toEqual({ hours: 0, minutes: 30, hasValue: true });
    });

    it('reads a full 4-digit string as hours and minutes', () => {
        expect(normalizeToHourMinute('0130', bounds)).toEqual({ hours: 1, minutes: 30, hasValue: true });
    });

    it('reads only the last 4 digits of a longer string', () => {
        expect(normalizeToHourMinute('990130', bounds)).toEqual({ hours: 1, minutes: 30, hasValue: true });
    });

    it('clamps hours and minutes independently to the given bounds', () => {
        expect(normalizeToHourMinute('9999', bounds)).toEqual({ hours: 99, minutes: 59, hasValue: true });
    });

    it('honors custom bounds instead of the field defaults', () => {
        expect(normalizeToHourMinute('1099', { maxHours: 5, maxMinutes: 45 })).toEqual({
            hours: 5,
            minutes: 45,
            hasValue: true,
        });
    });
});

describe('formatHourMinute: formats hour/minute parts as zero-padded hh:mm', () => {
    it('zero-pads single-digit hours and minutes', () => {
        expect(formatHourMinute({ hours: 1, minutes: 5 })).toBe('01:05');
    });

    it('formats double-digit hours and minutes unchanged', () => {
        expect(formatHourMinute({ hours: 12, minutes: 45 })).toBe('12:45');
    });
});

describe('resolveDurationDigit: classifies a caret position as one of the four hh:mm digits', () => {
    it('resolves to the digit immediately before the caret', () => {
        expect(resolveDurationDigit('02:59', 1)).toBe(0);
        expect(resolveDurationDigit('02:59', 2)).toBe(1);
        expect(resolveDurationDigit('02:59', 4)).toBe(3);
        expect(resolveDurationDigit('02:59', 5)).toBe(4);
    });

    it('returns null when there is no digit immediately before the caret', () => {
        expect(resolveDurationDigit('02:59', 0)).toBeNull();
        expect(resolveDurationDigit('02:59', 3)).toBeNull();
    });

    it('returns null for an empty value', () => {
        expect(resolveDurationDigit('', 0)).toBeNull();
    });
});

describe('stepDurationDigit: steps a single digit independently, clamped to bounds', () => {
    const bounds = { maxHours: 99, maxMinutes: 59 };

    it('increments the hours tens digit without touching the hours ones digit or minutes', () => {
        expect(stepDurationDigit({ hours: 3, minutes: 45 }, 0, 1, bounds)).toEqual({ hours: 13, minutes: 45 });
    });

    it('increments the hours ones digit without touching the hours tens digit', () => {
        expect(stepDurationDigit({ hours: 13, minutes: 45 }, 1, 1, bounds)).toEqual({ hours: 14, minutes: 45 });
    });

    it('decrements the hours tens digit', () => {
        expect(stepDurationDigit({ hours: 23, minutes: 0 }, 0, -1, bounds)).toEqual({ hours: 13, minutes: 0 });
    });

    it('increments the minutes ones digit without touching hours or the minutes tens digit', () => {
        expect(stepDurationDigit({ hours: 13, minutes: 45 }, 4, 1, bounds)).toEqual({ hours: 13, minutes: 46 });
    });

    it('clamps a digit at 9 instead of wrapping into the digit next to it', () => {
        expect(stepDurationDigit({ hours: 99, minutes: 0 }, 0, 1, bounds)).toEqual({ hours: 99, minutes: 0 });
    });

    it('clamps a digit at 0 instead of wrapping into the digit next to it', () => {
        expect(stepDurationDigit({ hours: 0, minutes: 0 }, 0, -1, bounds)).toEqual({ hours: 0, minutes: 0 });
    });

    it('clamps the field to its maximum when the tens digit alone would exceed it', () => {
        expect(stepDurationDigit({ hours: 0, minutes: 55 }, 3, 1, bounds)).toEqual({ hours: 0, minutes: 59 });
    });

    it('honors a custom bound instead of the field defaults', () => {
        expect(stepDurationDigit({ hours: 4, minutes: 0 }, 0, 1, { maxHours: 5, maxMinutes: 59 })).toEqual({
            hours: 5,
            minutes: 0,
        });
    });
});
