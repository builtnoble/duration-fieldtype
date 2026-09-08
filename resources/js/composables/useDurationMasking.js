import { reactive } from 'vue';
import { formatHourMinute, normalizeToHourMinute, sanitizeDigits, toCanonicalValue } from '@/lib/durationParsing';

const DEFAULT_MAX_HOURS = 99;
const DEFAULT_MAX_MINUTES = 59;

/**
 * Build maska options for duration input using Statamic field metadata.
 *
 * The input is displayed as hh:mm while the emitted value is a canonical hhmm
 * digit string used by the backend process() method.
 *
 * Also returns `bounds` so callers (DurationFieldtype.vue) can drive
 * segment-aware arrow-key stepping without re-deriving the resolved limits.
 *
 * @param {{ maxHours?: number, maxMinutes?: number }} meta
 * @param {{ onUnmaskedValue?: (unmaskedValue: string) => void }} [callbacks]
 *
 * @returns {{ options: import('vue').UnwrapNestedRefs<object>, bounds: { maxHours: number, maxMinutes: number } }}
 */
export const useDurationMasking = ({ maxHours, maxMinutes } = {}, { onUnmaskedValue } = {}) => {
    // Fall back to the field's default bounds when preload() hasn't supplied them.
    const bounds = {
        maxHours: Number.isFinite(Number(maxHours)) ? Number(maxHours) : DEFAULT_MAX_HOURS,
        maxMinutes: Number.isFinite(Number(maxMinutes)) ? Number(maxMinutes) : DEFAULT_MAX_MINUTES,
    };

    // Avoid duplicate onMaska emissions for the same normalized input value.
    let lastUnmaskedValue;

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

            const unmaskedValue = toCanonicalValue(normalized);

            if (unmaskedValue === lastUnmaskedValue) {
                return;
            }

            lastUnmaskedValue = unmaskedValue;

            if (typeof onUnmaskedValue !== 'function') {
                return;
            }

            onUnmaskedValue(unmaskedValue);
        },
    });

    return { options, bounds };
};
