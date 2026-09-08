<script setup>
import { Fieldtype } from '@statamic/cms';
import { Input } from '@statamic/cms/ui';
import { vMaska } from 'maska/vue';
import { useDurationMasking } from '@/composables/useDurationMasking';
import {
    applyDigitAtSlot,
    nextCaretAfterTyping,
    normalizeToHourMinute,
    resolveDurationDigit,
    resolveDurationTypingSlot,
    sanitizeDigits,
    stepDurationDigit,
    toCanonicalValue,
} from '@/lib/durationParsing';

const emit = defineEmits(Fieldtype.emits);
const props = defineProps(Fieldtype.props);

const { expose, update } = Fieldtype.use(emit, props);

defineExpose(expose);

const { options, bounds } = useDurationMasking(props.meta, {
    onUnmaskedValue: (unmaskedValue) => update(unmaskedValue),
});

// update() is called directly rather than through maska's own onMaska
// pipeline throughout this component: duration's maska config has no
// mask/number token (unlike currency's), so simulating an input event for
// maska to reprocess isn't meaningful here and risked maska misreading a
// digit that wasn't touched. If maska's own watcher also reacts to the
// resulting model change and re-fires onMaska, the composable's existing
// dedupe makes that a harmless no-op.
//
// Vue's re-render (triggered by update()) reassigns the input's raw value
// before maska's own directive re-run reformats it, resetting the caret to
// the end; restoring it on the next frame keeps the caret where the field's
// own editing model (not the browser's default text-editing behavior) says
// it belongs.
const restoreCaretOnNextFrame = (input, caret) => {
    requestAnimationFrame(() => {
        if (document.activeElement === input) {
            input.setSelectionRange(caret, caret);
        }
    });
};

// Handle ArrowUp/ArrowDown to increment or decrement whichever single digit
// the caret sits immediately after (hours tens/ones, minutes tens/ones),
// independently of the digit next to it. A caret with no digit right before
// it (the very start of the field, or just after the ":") leaves the
// keypress alone rather than guessing a target.
//
// Digit keys (0-9) overwrite whichever slot the caret currently sits at and
// advance to the next slot, like a fixed-width segmented date/time input --
// this replaces the default behavior of inserting the character into the
// raw text and re-deriving the value from "the last 4 digits typed
// anywhere", which produced surprising results when typing at a specific
// position (the same class of issue currency-fieldtype's positional editing
// exists to solve, though duration's fixed 4-digit shape needs far less
// machinery to fix).
const handleKeyDown = (event) => {
    const input = event.target;
    const caret = input.selectionStart ?? input.value.length;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const digitIndex = resolveDurationDigit(input.value, caret);

        if (digitIndex === null) {
            return;
        }

        event.preventDefault();

        const direction = event.key === 'ArrowUp' ? 1 : -1;
        const normalized = normalizeToHourMinute(input.value, bounds);
        const stepped = stepDurationDigit(normalized, digitIndex, direction, bounds);

        update(toCanonicalValue(stepped));
        restoreCaretOnNextFrame(input, caret);

        return;
    }

    if (/^\d$/.test(event.key)) {
        event.preventDefault();

        const slot = resolveDurationTypingSlot(caret);
        const normalized = normalizeToHourMinute(input.value, bounds);
        const updated = applyDigitAtSlot(normalized, slot, Number(event.key), bounds);

        update(toCanonicalValue(updated));
        restoreCaretOnNextFrame(input, nextCaretAfterTyping(slot));
    }
};

// Paste replaces the whole value rather than inserting at the caret: unlike
// currency's decimal-position-aware editing, duration has no digit grouping
// or decimal point to reason about, so pasted digits are just parsed and
// clamped the same way any other input is (via normalizeToHourMinute) and
// used to replace the field outright.
const handlePaste = (event) => {
    event.preventDefault();

    const pastedDigits = sanitizeDigits(event.clipboardData?.getData('text') ?? '');

    if (!pastedDigits) {
        return;
    }

    update(toCanonicalValue(normalizeToHourMinute(pastedDigits, bounds)));
};
</script>

<template>
    <Input v-maska="options" :model-value="value" @keydown="handleKeyDown" @paste="handlePaste" />
</template>
