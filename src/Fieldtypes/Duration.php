<?php

namespace Builtnoble\DurationFieldtype\Fieldtypes;

use Statamic\Fields\Fieldtype;

class Duration extends Fieldtype
{
    protected const MAX_HOURS = 99;

    protected const MAX_MINUTES = 59;

    protected const MILLISECONDS_PER_MINUTE = 60_000;

    protected $icon = 'time-clock';

    protected $keywords = ['time', 'duration', 'hours', 'minutes', 'seconds'];

    /**
     * Preload any additional data needed for the Vue component.
     */
    public function preload(): array
    {
        return [
            'maxHours' => self::MAX_HOURS,
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
     * Normalize raw duration input into hour/minute parts for persistence.
     *
     * Accepts masked values like "01:30" and unmasked digit values like
     * "0130" from the control panel fieldtype input. Any non-digit characters
     * are removed, the value is right-trimmed to the last 4 digits (hhmm), and
     * both parts are clamped to the configured max bounds.
     */
    protected function parseHourMinuteInput($value): array
    {
        $digits = preg_replace('/[^\d]/', '', (string) ($value ?? '')) ?? '';

        if ($digits === '') {
            return [0, 0];
        }

        $normalizedDigits = str_pad(substr($digits, -4), 4, '0', STR_PAD_LEFT);

        $hours = (int) substr($normalizedDigits, 0, 2);
        $minutes = (int) substr($normalizedDigits, 2, 2);

        return [
            min(max($hours, 0), self::MAX_HOURS),
            min(max($minutes, 0), self::MAX_MINUTES),
        ];
    }

    /**
     * Format stored milliseconds as a zero-padded "hh:mm" string.
     *
     * This is used for the control panel edit form and index listings so users
     * always see a consistent masked value that maps directly to the field input
     * format.
     */
    protected function formatMillisecondsAsHourMinute($value): string
    {
        [$hours, $minutes] = $this->toHourMinuteParts($value);

        return sprintf('%02d:%02d', $hours, $minutes);
    }

    /**
     * Convert stored milliseconds into clamped hour/minute parts.
     *
     * Durations are normalized to non-negative values, truncated to whole
     * minutes, and capped at the field limit of 99:59 so all downstream format
     * methods receive safe, bounded parts.
     */
    protected function toHourMinuteParts($value): array
    {
        $milliseconds = max((int) ($value ?? 0), 0);
        $totalMinutes = intdiv($milliseconds, self::MILLISECONDS_PER_MINUTE);
        $maxTotalMinutes = (self::MAX_HOURS * 60) + self::MAX_MINUTES;

        if ($totalMinutes >= $maxTotalMinutes) {
            return [self::MAX_HOURS, self::MAX_MINUTES];
        }

        $hours = intdiv($totalMinutes, 60);
        $minutes = $totalMinutes % 60;

        return [$hours, $minutes];
    }
}
