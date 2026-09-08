import { reactive } from 'vue';
import {
    formatHourMinute,
    normalizeToHourMinute,
    resolveDurationSegment,
    sanitizeDigits,
    stepDuration,
} from '@/lib/durationParsing';

const DEFAULT_MAX_HOURS = 99;
const DEFAULT_MAX_MINUTES = 59;

/**
 * Restore the caret to where it was before an arrow-key step.
 *
 * update() triggers a Vue re-render that reassigns the input's raw DOM value
 * before maska's own directive re-run reformats it; that intermediate
 * assignment resets the caret to the end. Re-applying it synchronously and
 * once more on the next frame (same fix as useCurrencyMasking.js's caret
 * handling) keeps repeated stepping on the same hh:mm segment.
 *
 * @param {HTMLInputElement} input
 * @param {number} caret
 */
const restoreCaret = (input, caret) => {
    if (typeof input?.setSelectionRange !== 'function') {
        return;
    }

    input.setSelectionRange(caret, caret);

    if (typeof requestAnimationFrame !== 'function') {
        return;
    }

    requestAnimationFrame(() => {
        if (document.activeElement === input) {
            input.setSelectionRange(caret, caret);
        }
    });
};

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
     * Handle ArrowUp/ArrowDown keypresses to increment or decrement whichever
     * segment (hours or minutes) the caret is currently positioned in.
     * Prevents the default cursor-movement behaviour that browsers apply to
     * text inputs on arrow keys.
     */
    const handleKeyDown = (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        event.preventDefault();

        const input = event.target;
        const value = input?.value ?? '';
        const caret = input?.selectionStart ?? value.length;
        const segment = resolveDurationSegment(value, caret);
        const direction = event.key === 'ArrowUp' ? 1 : -1;

        const normalized = normalizeToHourMinute(value, bounds);
        const { hours, minutes } = stepDuration(normalized, segment, direction, bounds);

        emitCanonical(hours, minutes);
        restoreCaret(input, caret);
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
