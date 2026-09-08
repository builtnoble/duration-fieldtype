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
