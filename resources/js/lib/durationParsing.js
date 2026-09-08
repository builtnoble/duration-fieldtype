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
 * Format hour/minute parts as the canonical unmasked "hhmm" digit string
 * sent to the backend's process() method, as opposed to formatHourMinute's
 * "hh:mm" display format.
 *
 * @param {{ hours: number, minutes: number }} parts
 *
 * @returns {string}
 */
export const toCanonicalValue = ({ hours, minutes }) =>
    `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;

/**
 * Determine which single digit (by character index into a formatted "hh:mm"
 * display value) a caret position should step, so arrow-key stepping can act
 * on exactly the digit the cursor is touching.
 *
 * Only a caret sitting immediately after a digit resolves to that digit. A
 * caret with no digit right before it (the very start of the string, or just
 * after the ":" separator) resolves to nothing, keeping the rule unambiguous
 * rather than guessing which neighboring digit was intended.
 *
 * @param {string} value
 * @param {number} caret
 *
 * @returns {number | null} a character index into `value` (0, 1, 3, or 4), or null if the caret isn't right after a digit
 */
export const resolveDurationDigit = (value, caret) => {
    const precedingChar = value[caret - 1];

    return precedingChar !== undefined && /\d/.test(precedingChar) ? caret - 1 : null;
};

/**
 * Step a single digit (identified by its character index into a formatted
 * "hh:mm" value) by one unit, independently of the other digit in its field.
 *
 * The digit wraps back to 0 (incrementing) rather than carrying into the
 * other digit, once it either exceeds 9 or would push the field's value past
 * its bounds -- e.g. minutes' tens digit going from 5 to 6 restarts at 0
 * rather than producing an invalid 6X value. Decrementing below 0 wraps to
 * the *largest* digit that still keeps the field within bounds given the
 * other digit's current value, not always 9 -- e.g. with minutes ones fixed
 * at 3 and a 59 cap, the tens digit can only reach 5 (53), not 9 (93).
 *
 * @param {{ hours: number, minutes: number }} parts
 * @param {number} digitIndex 0 (hours tens), 1 (hours ones), 3 (minutes tens), or 4 (minutes ones)
 * @param {1 | -1} direction
 * @param {{ maxHours: number, maxMinutes: number }} bounds
 *
 * @returns {{ hours: number, minutes: number }}
 */
export const stepDurationDigit = (parts, digitIndex, direction, { maxHours, maxMinutes }) => {
    const isHours = digitIndex === 0 || digitIndex === 1;
    const place = digitIndex === 0 || digitIndex === 3 ? 10 : 1;
    const fieldValue = isHours ? parts.hours : parts.minutes;
    const maxForField = isHours ? maxHours : maxMinutes;

    const currentDigit = Math.floor(fieldValue / place) % 10;
    const otherDigitsValue = fieldValue - currentDigit * place;

    let newDigit = currentDigit + direction;
    let steppedValue = otherDigitsValue + newDigit * place;

    if (newDigit < 0 || newDigit > 9 || steppedValue < 0 || steppedValue > maxForField) {
        newDigit = direction > 0 ? 0 : Math.min(9, Math.max(0, Math.floor((maxForField - otherDigitsValue) / place)));
        steppedValue = otherDigitsValue + newDigit * place;
    }

    return isHours ? { hours: steppedValue, minutes: parts.minutes } : { hours: parts.hours, minutes: steppedValue };
};

/**
 * Determine which digit slot a caret position should overwrite when a digit
 * key is typed, so typing behaves like a fixed-width segmented input (each
 * keystroke fills the current slot and advances to the next) instead of
 * naively re-deriving the value from whatever the last 4 digits typed
 * anywhere in the field happen to be.
 *
 * A caret past a slot's own position but still short of the next one
 * resolves to that next slot -- e.g. a caret just after the hours ones
 * digit, but still before the minutes tens digit, advances into minutes.
 *
 * @param {number} caret
 *
 * @returns {number} a character index into a "hh:mm" value (0, 1, 3, or 4)
 */
export const resolveDurationTypingSlot = (caret) => {
    if (caret <= 1) {
        return caret;
    }

    return caret <= 3 ? 3 : 4;
};

/**
 * The caret position to land on after typing a digit into the given slot, so
 * sequential typing advances through "hh:mm" the way a segmented date/time
 * input does (skipping over the ":" separator).
 *
 * @param {number} slot
 *
 * @returns {number}
 */
export const nextCaretAfterTyping = (slot) => {
    if (slot === 0) {
        return 1;
    }

    return slot === 1 ? 3 : slot === 3 ? 4 : 5;
};

/**
 * Overwrite the digit at the given slot with a newly typed value, clamped to
 * the field's bounds, leaving the other digit in that field untouched.
 *
 * @param {{ hours: number, minutes: number }} parts
 * @param {number} slot 0 (hours tens), 1 (hours ones), 3 (minutes tens), or 4 (minutes ones)
 * @param {number} digit 0-9
 * @param {{ maxHours: number, maxMinutes: number }} bounds
 *
 * @returns {{ hours: number, minutes: number }}
 */
export const applyDigitAtSlot = (parts, slot, digit, { maxHours, maxMinutes }) => {
    const isHours = slot === 0 || slot === 1;
    const place = slot === 0 || slot === 3 ? 10 : 1;
    const fieldValue = isHours ? parts.hours : parts.minutes;
    const maxForField = isHours ? maxHours : maxMinutes;

    const currentDigit = Math.floor(fieldValue / place) % 10;
    const otherDigitsValue = fieldValue - currentDigit * place;
    const newFieldValue = Math.min(otherDigitsValue + digit * place, maxForField);

    return isHours ? { hours: newFieldValue, minutes: parts.minutes } : { hours: parts.hours, minutes: newFieldValue };
};
