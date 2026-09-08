/**
 * Strip every non-digit character from a raw duration input value.
 *
 * @param {*} value
 *
 * @returns {string}
 */
export const sanitizeDigits = (value) => String(value ?? '').replace(/[^\d]/g, '');

/**
 * Normalize sanitized duration digits into hour/minute parts, clamped to the
 * given bounds.
 *
 * Only the last 4 digits are read (hhmm), left-padded with zeros, so partial
 * input like "130" is treated as "0130" rather than "1300".
 *
 * @param {*} value
 * @param {{ maxHours: number, maxMinutes: number }} bounds
 *
 * @returns {{ hours: number, minutes: number, hasValue: boolean }}
 */
export const normalizeToHourMinute = (value, { maxHours, maxMinutes }) => {
    const digits = sanitizeDigits(value).slice(-4);

    if (!digits) {
        return {
            hours: 0,
            minutes: 0,
            hasValue: false,
        };
    }

    const padded = digits.padStart(4, '0');

    let hours = Number.parseInt(padded.slice(0, 2), 10);
    let minutes = Number.parseInt(padded.slice(2, 4), 10);

    if (!Number.isFinite(hours) || hours < 0) {
        hours = 0;
    }

    if (!Number.isFinite(minutes) || minutes < 0) {
        minutes = 0;
    }

    hours = Math.min(hours, maxHours);
    minutes = Math.min(minutes, maxMinutes);

    return {
        hours,
        minutes,
        hasValue: true,
    };
};

/**
 * Format hour/minute parts as a zero-padded "hh:mm" string.
 *
 * @param {{ hours: number, minutes: number }} parts
 *
 * @returns {string}
 */
export const formatHourMinute = ({ hours, minutes }) => {
    const normalizedHours = String(hours).padStart(2, '0');
    const normalizedMinutes = String(minutes).padStart(2, '0');

    return `${normalizedHours}:${normalizedMinutes}`;
};

/**
 * Determine which duration segment a caret position falls within for a
 * formatted "hh:mm" display value, so arrow-key stepping can act on whichever
 * segment the cursor is in rather than always stepping minutes.
 *
 * @param {string} value
 * @param {number} caret
 *
 * @returns {'hours' | 'minutes'}
 */
export const resolveDurationSegment = (value, caret) => {
    const separatorIndex = value.indexOf(':');

    if (separatorIndex === -1) {
        return 'minutes';
    }

    return caret <= separatorIndex ? 'hours' : 'minutes';
};

/**
 * Step a duration by one unit in the given segment.
 *
 * Stepping hours only ever changes the hours part, clamped independently to
 * `maxHours`. Stepping minutes carries overflow/underflow into hours (like a
 * clock), clamped to the field's combined maximum duration.
 *
 * @param {{ hours: number, minutes: number }} parts
 * @param {'hours' | 'minutes'} segment
 * @param {1 | -1} direction
 * @param {{ maxHours: number, maxMinutes: number }} bounds
 *
 * @returns {{ hours: number, minutes: number }}
 */
export const stepDuration = (parts, segment, direction, { maxHours, maxMinutes }) => {
    if (segment === 'hours') {
        return {
            hours: Math.min(Math.max(parts.hours + direction, 0), maxHours),
            minutes: parts.minutes,
        };
    }

    const maxTotalMinutes = maxHours * 60 + maxMinutes;
    const currentTotalMinutes = parts.hours * 60 + parts.minutes;
    const totalMinutes = Math.min(Math.max(currentTotalMinutes + direction, 0), maxTotalMinutes);

    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
    };
};
