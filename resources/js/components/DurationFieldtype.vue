<script setup>
import { Fieldtype } from '@statamic/cms';
import { Input } from '@statamic/cms/ui';
import { vMaska } from 'maska/vue';
import { useDurationMasking } from '@/composables/useDurationMasking';
import { normalizeToHourMinute, resolveDurationDigit, stepDurationDigit } from '@/lib/durationParsing';

const emit = defineEmits(Fieldtype.emits);
const props = defineProps(Fieldtype.props);

const { expose, update } = Fieldtype.use(emit, props);

defineExpose(expose);

const { options, bounds } = useDurationMasking(props.meta, {
    onUnmaskedValue: (unmaskedValue) => update(unmaskedValue),
});

// Handle ArrowUp/ArrowDown keypresses to increment or decrement whichever
// single digit the caret sits immediately after (hours tens/ones, minutes
// tens/ones), independently of the digit next to it. A caret with no digit
// right before it (the very start of the field, or just after the ":")
// leaves the keypress alone rather than guessing a target.
//
// update() is called directly rather than through maska's own onMaska
// pipeline: duration's maska config has no mask/number token (unlike
// currency's), so simulating an input event for maska to reprocess isn't
// meaningful here and risked maska misreading the digit that wasn't
// touched. If maska's own watcher also reacts to the resulting model change
// and re-fires onMaska, the composable's existing dedupe makes that a
// harmless no-op.
//
// Vue's re-render (triggered by update()) reassigns the input's raw value
// before maska's own directive re-run reformats it, resetting the caret to
// the end; restoring it on the next frame keeps repeated stepping on the
// same digit.
const handleKeyDown = (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
        return;
    }

    const input = event.target;
    const caret = input.selectionStart ?? input.value.length;
    const digitIndex = resolveDurationDigit(input.value, caret);

    if (digitIndex === null) {
        return;
    }

    event.preventDefault();

    const direction = event.key === 'ArrowUp' ? 1 : -1;

    const normalized = normalizeToHourMinute(input.value, bounds);
    const { hours, minutes } = stepDurationDigit(normalized, digitIndex, direction, bounds);

    update(`${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`);

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
