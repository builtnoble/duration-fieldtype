<script setup>
import { Fieldtype } from "@statamic/cms";
import { Input } from "@statamic/cms/ui";
import { vMaska } from "maska/vue";
import { useDurationMasking } from "@/composables/useDurationMasking";

const emit = defineEmits(Fieldtype.emits);
const props = defineProps(Fieldtype.props);

const { expose, update } = Fieldtype.use(emit, props);

defineExpose(expose);

const { options, handleKeyDown } = useDurationMasking(props.meta, {
    onUnmaskedValue: (unmaskedValue) => update(unmaskedValue),
});
</script>

<template>
    <Input v-maska="options" :model-value="value" @keydown="handleKeyDown" />
</template>
