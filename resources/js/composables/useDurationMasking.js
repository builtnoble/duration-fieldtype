import { reactive } from "vue";

const MAX_HOURS = 99;
const MAX_MINUTES = 59;

const sanitizeDigits = (value) => String(value ?? '').replace(/[^\d]/g, '');

const normalizeToHourMinute = (value) => {
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

    hours = Math.min(hours, MAX_HOURS);
    minutes = Math.min(minutes, MAX_MINUTES);

    return {
        hours,
        minutes,
        hasValue: true,
    };
};

const formatHourMinute = ({ hours, minutes }) => {
    const normalizedHours = String(hours).padStart(2, '0');
    const normalizedMinutes = String(minutes).padStart(2, '0');

    return `${normalizedHours}:${normalizedMinutes}`;
};

const MAX_TOTAL_MINUTES = MAX_HOURS * 60 + MAX_MINUTES;

/**
 * Build maska options for duration input.
 *
 * The input is displayed as hh:mm while the emitted value is a canonical hhmm
 * digit string used by the backend process() method.
 *
 * @param {{ maxHours?: number }} _meta
 * @param {{ onUnmaskedValue?: (unmaskedValue: string) => void }} [callbacks]
 *
 * @returns {{ options: import('vue').UnwrapNestedRefs<object> }}
 */

export const useDurationMasking = (_meta = {}, { onUnmaskedValue } = {}) => {
    let lastUnmaskedValue;

    const emitCanonical = (hours, minutes) => {
        const unmaskedValue = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;

        if (unmaskedValue === lastUnmaskedValue) {
            return;
        }

        lastUnmaskedValue = unmaskedValue;

        if (typeof onUnmaskedValue === 'function') {
            onUnmaskedValue(unmaskedValue);
        }
    };

    /**
     * Handle ArrowUp/ArrowDown keypresses to increment or decrement the
     * duration by one minute. Prevents the default cursor-movement behaviour
     * that browsers apply to text inputs on arrow keys.
     */
    const handleKeyDown = (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        event.preventDefault();

        const normalized = normalizeToHourMinute(event.target?.value ?? '');
        const currentTotalMinutes = normalized.hours * 60 + normalized.minutes;

        const newTotalMinutes = event.key === 'ArrowUp'
            ? Math.min(currentTotalMinutes + 1, MAX_TOTAL_MINUTES)
            : Math.max(currentTotalMinutes - 1, 0);

        const newHours = Math.floor(newTotalMinutes / 60);
        const newMinutes = newTotalMinutes % 60;

        emitCanonical(newHours, newMinutes);
    };

    const options = reactive({
        preProcess: (value) => sanitizeDigits(value),
        postProcess: (value) => {
            const normalized = normalizeToHourMinute(value);

            if (!normalized.hasValue) {
                return '';
            }

            return formatHourMinute(normalized);
        },
        onMaska: (eventOrDetail) => {
            const detail = eventOrDetail?.detail ?? eventOrDetail;
            const unmaskedRaw = detail?.unmasked ?? '';
            const normalized = normalizeToHourMinute(unmaskedRaw);

            if (!normalized.hasValue) {
                return;
            }

            emitCanonical(normalized.hours, normalized.minutes);
        },
    });

    return { options, handleKeyDown };
};
