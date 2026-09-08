<?php

namespace Builtnoble\DurationFieldtype\Fieldtypes;

use Statamic\Fields\Fieldtype;

class Duration extends Fieldtype
{
    protected const DEFAULT_MAX_HOURS = 99;

    protected const MAX_MINUTES = 59;

    protected const MILLISECONDS_PER_MINUTE = 60_000;

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

        $minuteLabel = $minutes === 1 ? 'min' : 'mins';

        if ($hours === 0) {
            return sprintf('%02d %s', $minutes, $minuteLabel);
        }

        $hourLabel = $hours === 1 ? 'hr' : 'hrs';

        if ($minutes === 0) {
            return sprintf('%02d %s', $hours, $hourLabel);
        }

        return sprintf('%02d %s %02d %s', $hours, $hourLabel, $minutes, $minuteLabel);
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
}
