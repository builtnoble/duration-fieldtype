<script setup>
import { Fieldtype } from '@statamic/cms';
import { Input } from '@statamic/cms/ui';
import { vMaska } from 'maska/vue';
import { useDurationMasking } from '@/composables/useDurationMasking';
import { formatHourMinute, normalizeToHourMinute, resolveDurationDigit, stepDurationDigit } from '@/lib/durationParsing';

const emit = defineEmits(Fieldtype.emits);
const props = defineProps(Fieldtype.props);

const { expose, update } = Fieldtype.use(emit, props);

defineExpose(expose);

const { options, bounds } = useDurationMasking(props.meta, {
    onUnmaskedValue: (unmaskedValue) => update(unmaskedValue),
});

// Handle ArrowUp/ArrowDown keypresses to increment or decrement whichever
// single digit the caret is currently touching (hours tens/ones, minutes
// tens/ones), independently of the digit next to it. Setting input.value and
// dispatching a real InputEvent lets maska's own onInput/onMaska pipeline
// reprocess the new duration normally (confirmed idempotent) and update()
// fires through the existing wiring rather than a separate code path.
//
// That pipeline triggers a Vue re-render that reassigns the input's raw
// value from the fieldtype's underlying model before maska's own directive
// re-run reformats it; that intermediate assignment resets the caret to the
// end. Re-applying it once now and once more on the next frame (after that
// settles) keeps repeated arrow-key stepping on the same digit.
const handleKeyDown = (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
        return;
    }

    event.preventDefault();

    const input = event.target;
    const caret = input.selectionStart ?? input.value.length;
    // A caret with no adjacent digit (an empty/malformed value) falls back
    // to the rightmost digit, matching the field's minutes-first defaults.
    const digitIndex = resolveDurationDigit(input.value, caret) ?? 4;
    const direction = event.key === 'ArrowUp' ? 1 : -1;

    const normalized = normalizeToHourMinute(input.value, bounds);
    const stepped = stepDurationDigit(normalized, digitIndex, direction, bounds);

    input.value = formatHourMinute(stepped);
    input.setSelectionRange(caret, caret);

    input.dispatchEvent(
        new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: direction > 0 ? 'insertText' : 'deleteContentBackward',
        }),
    );

    requestAnimationFrame(() => {
        if (document.activeElement === input) {
            input.setSelectionRange(caret, caret);
        }
    });
};
</script>

<template>
    <Input v-maska="options" :model-value="value" @keydown="handleKeyDown" />
</template>
