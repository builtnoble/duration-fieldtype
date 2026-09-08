<?php

namespace Builtnoble\DurationFieldtype\Fieldtypes;

use Statamic\Fields\Fieldtype;

class Duration extends Fieldtype
{
    protected const DEFAULT_MAX_HOURS = 99;

    protected const MAX_MINUTES = 59;

    protected const MILLISECONDS_PER_MINUTE = 60_000;

    protected const LABEL_KEYS = ['hourLabel', 'hourLabelPlural', 'minuteLabel', 'minuteLabelPlural'];

    protected $icon = 'time-clock';

    protected $keywords = ['time', 'duration', 'hours', 'minutes', 'seconds'];

    protected function configFieldItems(): array
    {
        return [
            'maxHours' => [
                'display' => __('Max Hours'),
                'instructions' => __('The maximum number of hours allowed, from 0 to 99.'),
                'type' => 'integer',
                'default' => self::DEFAULT_MAX_HOURS,
                'min' => 0,
                'max' => self::DEFAULT_MAX_HOURS,
                'width' => 100,
            ],
            'stripLeadingZero' => [
                'display' => __('Strip Leading Zero'),
                'instructions' => __('Show numbers without a leading zero in Antlers output, e.g. "3 hrs" instead of "03 hrs".'),
                'type' => 'toggle',
                'default' => false,
                'if' => array_fill_keys(self::LABEL_KEYS, 'not empty'),
                'width' => 100,
            ],
            'hourLabel' => [
                'display' => __('Hour Label (Singular)'),
                'instructions' => __('The label shown after a single hour in Antlers output, e.g. "hr". All four label fields must be filled in for Antlers output to use them; otherwise it stays plain hh:mm, matching the Control Panel display.'),
                'type' => 'text',
                'width' => 50,
            ],
            'hourLabelPlural' => [
                'display' => __('Hour Label (Plural)'),
                'instructions' => __('The label shown after more than one hour in Antlers output, e.g. "hrs".'),
                'type' => 'text',
                'width' => 50,
            ],
            'minuteLabel' => [
                'display' => __('Minute Label (Singular)'),
                'instructions' => __('The label shown after a single minute in Antlers output, e.g. "min".'),
                'type' => 'text',
                'width' => 50,
            ],
            'minuteLabelPlural' => [
                'display' => __('Minute Label (Plural)'),
                'instructions' => __('The label shown after more than one minute in Antlers output, e.g. "mins".'),
                'type' => 'text',
                'width' => 50,
            ],
        ];
    }

    /**
     * Preload any additional data needed for the Vue component.
     */
    public function preload(): array
    {
        return [
            'maxHours' => $this->maxHours(),
            'maxMinutes' => self::MAX_MINUTES,
        ];
    }

    /**
     * Return the string representation of the given value to the Vue component,
     * e.g. "02:30"
     */
    public function preProcess($value): ?string
    {
        return $this->formatMillisecondsAsHourMinute($value);
    }

    /**
     * Return the formatted value shown in control panel index listings.
     */
    public function preProcessIndex($value): ?string
    {
        return $this->formatMillisecondsAsHourMinute($value);
    }

    /**
     * Process the data before it gets saved.
     */
    public function process($value): int
    {
        [$hours, $minutes] = $this->parseHourMinuteInput($value);

        $totalMinutes = ($hours * 60) + $minutes;

        return $totalMinutes * self::MILLISECONDS_PER_MINUTE;
    }

    /**
     * Format the stored value when augmented for Antlers.
     */
    public function augment($value): string
    {
        [$hours, $minutes] = $this->toHourMinuteParts($value);

        if (! $this->hasCompleteLabelConfiguration()) {
            return sprintf('%02d:%02d', $hours, $minutes);
        }

        $minuteLabel = $this->minuteLabel($minutes);

        if ($hours === 0) {
            return sprintf('%s %s', $this->formatNumber($minutes), $minuteLabel);
        }

        $hourLabel = $this->hourLabel($hours);

        if ($minutes === 0) {
            return sprintf('%s %s', $this->formatNumber($hours), $hourLabel);
        }

        return sprintf(
            '%s %s %s %s',
            $this->formatNumber($hours),
            $hourLabel,
            $this->formatNumber($minutes),
            $minuteLabel
        );
    }

    /**
     * Parse masked "01:30" or canonical unmasked "0130" input into hour/minute
     * parts, clamped to the field's bounds.
     *
     * @return array{int, int}
     */
    protected function parseHourMinuteInput(mixed $value): array
    {
        $digits = preg_replace('/[^\d]/', '', (string) ($value ?? ''));

        if ($digits === '') {
            return [0, 0];
        }

        $normalizedDigits = str_pad(substr($digits, -4), 4, '0', STR_PAD_LEFT);

        $hours = (int) substr($normalizedDigits, 0, 2);
        $minutes = (int) substr($normalizedDigits, 2, 2);

        return $this->clampToBounds($hours, $minutes);
    }

    /**
     * Format stored milliseconds as a zero-padded "hh:mm" string.
     */
    protected function formatMillisecondsAsHourMinute(mixed $value): string
    {
        [$hours, $minutes] = $this->toHourMinuteParts($value);

        return sprintf('%02d:%02d', $hours, $minutes);
    }

    /**
     * Convert stored milliseconds into clamped hour/minute parts.
     *
     * @return array{int, int}
     */
    protected function toHourMinuteParts(mixed $value): array
    {
        $milliseconds = max((int) ($value ?? 0), 0);
        $totalMinutes = intdiv($milliseconds, self::MILLISECONDS_PER_MINUTE);

        return $this->clampToBounds(intdiv($totalMinutes, 60), $totalMinutes % 60);
    }

    /**
     * Clamp hour/minute parts to the field's maximum duration.
     *
     * @return array{int, int}
     */
    protected function clampToBounds(int $hours, int $minutes): array
    {
        $maxHours = $this->maxHours();

        if (($hours * 60) + $minutes >= ($maxHours * 60) + self::MAX_MINUTES) {
            return [$maxHours, self::MAX_MINUTES];
        }

        return [$hours, min($minutes, self::MAX_MINUTES)];
    }

    /**
     * The configured maximum number of hours, clamped to what the field's
     * two-digit hh:mm display can represent, falling back to the default
     * when unset or invalid.
     */
    protected function maxHours(): int
    {
        $configured = $this->config('maxHours');

        if (! is_numeric($configured)) {
            return self::DEFAULT_MAX_HOURS;
        }

        return min(max((int) $configured, 0), self::DEFAULT_MAX_HOURS);
    }

    /**
     * Whether all four label fields are filled in. Configuring only some of
     * them (e.g. hour labels but not minute labels) would mean falling back
     * to an English word for the others, defeating the point of localizing
     * in the first place -- so augment() only switches away from plain
     * "hh:mm" once every label is explicitly set. The Strip Leading Zero
     * field's own "if" condition keeps it hidden in the Control Panel until
     * this is true, matching its being a no-op in code either way.
     */
    protected function hasCompleteLabelConfiguration(): bool
    {
        foreach (self::LABEL_KEYS as $key) {
            $configured = $this->config($key);

            if (! is_string($configured) || $configured === '') {
                return false;
            }
        }

        return true;
    }

    /**
     * The configured hour label for the given count (singular or plural).
     * Only called once hasCompleteLabelConfiguration() has confirmed every
     * label is set, so there's no English-default fallback to reach for here.
     */
    protected function hourLabel(int $hours): string
    {
        return (string) $this->config($hours === 1 ? 'hourLabel' : 'hourLabelPlural');
    }

    /**
     * The configured minute label for the given count (singular or plural).
     */
    protected function minuteLabel(int $minutes): string
    {
        return (string) $this->config($minutes === 1 ? 'minuteLabel' : 'minuteLabelPlural');
    }

    /**
     * Format a number for Antlers output, zero-padded to two digits unless
     * the field is configured to strip the leading zero.
     */
    protected function formatNumber(int $number): string
    {
        return $this->stripLeadingZero() ? (string) $number : sprintf('%02d', $number);
    }

    protected function stripLeadingZero(): bool
    {
        return (bool) $this->config('stripLeadingZero', false);
    }
}
