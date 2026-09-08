import { reactive } from 'vue';
import { formatHourMinute, normalizeToHourMinute, sanitizeDigits } from '@/lib/durationParsing';

const DEFAULT_MAX_HOURS = 99;
const DEFAULT_MAX_MINUTES = 59;

/**
 * Build maska options for duration input using Statamic field metadata.
 *
 * The input is displayed as hh:mm while the emitted value is a canonical hhmm
 * digit string used by the backend process() method.
 *
 * @param {{ maxHours?: number, maxMinutes?: number }} meta
 * @param {{ onUnmaskedValue?: (unmaskedValue: string) => void }} [callbacks]
 *
 * @returns {{ options: import('vue').UnwrapNestedRefs<object>, handleKeyDown: (event: KeyboardEvent) => void }}
 */
export const useDurationMasking = ({ maxHours, maxMinutes } = {}, { onUnmaskedValue } = {}) => {
    // Fall back to the field's default bounds when preload() hasn't supplied them.
    const bounds = {
        maxHours: Number.isFinite(Number(maxHours)) ? Number(maxHours) : DEFAULT_MAX_HOURS,
        maxMinutes: Number.isFinite(Number(maxMinutes)) ? Number(maxMinutes) : DEFAULT_MAX_MINUTES,
    };

    const maxTotalMinutes = bounds.maxHours * 60 + bounds.maxMinutes;

    // Avoid duplicate onMaska emissions for the same normalized input value.
    let lastUnmaskedValue;

    const emitCanonical = (hours, minutes) => {
        const unmaskedValue = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;

        if (unmaskedValue === lastUnmaskedValue) {
            return;
        }

        lastUnmaskedValue = unmaskedValue;

        if (typeof onUnmaskedValue !== 'function') {
            return;
        }

        onUnmaskedValue(unmaskedValue);
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

        const normalized = normalizeToHourMinute(event.target?.value ?? '', bounds);
        const currentTotalMinutes = normalized.hours * 60 + normalized.minutes;

        const newTotalMinutes =
            event.key === 'ArrowUp'
                ? Math.min(currentTotalMinutes + 1, maxTotalMinutes)
                : Math.max(currentTotalMinutes - 1, 0);

        const newHours = Math.floor(newTotalMinutes / 60);
        const newMinutes = newTotalMinutes % 60;

        emitCanonical(newHours, newMinutes);
    };

    const options = reactive({
        preProcess: (value) => sanitizeDigits(value),
        postProcess: (value) => {
            const normalized = normalizeToHourMinute(value, bounds);

            if (!normalized.hasValue) {
                return '';
            }

            return formatHourMinute(normalized);
        },
        onMaska: (eventOrDetail) => {
            const detail = eventOrDetail?.detail ?? eventOrDetail;
            const unmaskedRaw = detail?.unmasked ?? '';
            const normalized = normalizeToHourMinute(unmaskedRaw, bounds);

            if (!normalized.hasValue) {
                return;
            }

            emitCanonical(normalized.hours, normalized.minutes);
        },
    });

    return { options, handleKeyDown };
};
