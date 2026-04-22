import DurationFieldtype from "./components/DurationFieldtype.vue";

Statamic.booting(() => {
	Statamic.$components.register('duration-fieldtype', DurationFieldtype);
});
