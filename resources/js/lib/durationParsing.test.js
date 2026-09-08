import { describe, expect, it } from 'vitest';
import {
    formatHourMinute,
    normalizeToHourMinute,
    resolveDurationSegment,
    sanitizeDigits,
    stepDuration,
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

describe('resolveDurationSegment: classifies a caret position as hours or minutes', () => {
    it('classifies a caret before the separator as hours', () => {
        expect(resolveDurationSegment('02:59', 0)).toBe('hours');
        expect(resolveDurationSegment('02:59', 1)).toBe('hours');
    });

    it('classifies a caret sitting on the separator as still within hours', () => {
        expect(resolveDurationSegment('02:59', 2)).toBe('hours');
    });

    it('classifies a caret after the separator as minutes', () => {
        expect(resolveDurationSegment('02:59', 3)).toBe('minutes');
        expect(resolveDurationSegment('02:59', 5)).toBe('minutes');
    });

    it('defaults to minutes when the value has no separator', () => {
        expect(resolveDurationSegment('', 0)).toBe('minutes');
    });
});

describe('stepDuration: steps one segment by a direction, clamped to bounds', () => {
    const bounds = { maxHours: 99, maxMinutes: 59 };

    it('increments hours without touching minutes', () => {
        expect(stepDuration({ hours: 2, minutes: 59 }, 'hours', 1, bounds)).toEqual({ hours: 3, minutes: 59 });
    });

    it('decrements hours without touching minutes', () => {
        expect(stepDuration({ hours: 3, minutes: 59 }, 'hours', -1, bounds)).toEqual({ hours: 2, minutes: 59 });
    });

    it('clamps hours at the field maximum instead of rolling minutes over', () => {
        expect(stepDuration({ hours: 99, minutes: 59 }, 'hours', 1, bounds)).toEqual({ hours: 99, minutes: 59 });
    });

    it('floors hours at zero', () => {
        expect(stepDuration({ hours: 0, minutes: 30 }, 'hours', -1, bounds)).toEqual({ hours: 0, minutes: 30 });
    });

    it('increments minutes and carries overflow into hours', () => {
        expect(stepDuration({ hours: 2, minutes: 59 }, 'minutes', 1, bounds)).toEqual({ hours: 3, minutes: 0 });
    });

    it('decrements minutes and borrows underflow from hours', () => {
        expect(stepDuration({ hours: 3, minutes: 0 }, 'minutes', -1, bounds)).toEqual({ hours: 2, minutes: 59 });
    });

    it('clamps minutes stepping at the combined field maximum', () => {
        expect(stepDuration({ hours: 99, minutes: 59 }, 'minutes', 1, bounds)).toEqual({ hours: 99, minutes: 59 });
    });

    it('floors minutes stepping at zero', () => {
        expect(stepDuration({ hours: 0, minutes: 0 }, 'minutes', -1, bounds)).toEqual({ hours: 0, minutes: 0 });
    });
});
