<?php

describe('preload method: supplies metadata required by the Vue fieldtype component', function () {
    it('preloads max hour metadata for the Vue component', function () {
        $preload = $this->fieldtype->preload();

        expect($preload)
            ->toBeArray()
            ->and($preload['maxHours'])->toBe(99)
            ->and($preload['maxMinutes'])->toBe(59);
    });

    it('preloads a configured maxHours value', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => 5]);

        expect($fieldtype->preload()['maxHours'])->toBe(5);
    });

    it('clamps a configured maxHours above 99 down to 99', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => 150]);

        expect($fieldtype->preload()['maxHours'])->toBe(99);
    });

    it('clamps a configured maxHours below 0 up to 0', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => -10]);

        expect($fieldtype->preload()['maxHours'])->toBe(0);
    });

    it('falls back to 99 for a non-numeric maxHours config', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => 'not-a-number']);

        expect($fieldtype->preload()['maxHours'])->toBe(99);
    });
});

describe('preProcess method: transforms stored milliseconds into hh:mm', function () {
    it('formats a millisecond value as hh:mm', function () {
        expect($this->fieldtype->preProcess(5_400_000))->toBe('01:30');
    });

    it('returns 00:00 for null input', function () {
        expect($this->fieldtype->preProcess(null))->toBe('00:00');
    });

    it('truncates partial minutes when formatting from milliseconds', function () {
        expect($this->fieldtype->preProcess(59_999))->toBe('00:00')
            ->and($this->fieldtype->preProcess(60_000))->toBe('00:01');
    });

    it('caps formatted values at 99:59 for large durations', function () {
        expect($this->fieldtype->preProcess(900_000_000))->toBe('99:59');
    });
});

describe('preProcessIndex method: transforms values for control panel index listings', function () {
    it('returns hh:mm for index values', function () {
        expect($this->fieldtype->preProcessIndex(5_400_000))->toBe('01:30');
    });

    it('returns 00:00 for null index values', function () {
        expect($this->fieldtype->preProcessIndex(null))->toBe('00:00');
    });
});

describe('process method: transforms hh:mm input into milliseconds', function () {
    it('stores hh:mm input as milliseconds', function () {
        expect($this->fieldtype->process('01:30'))->toBe(5_400_000);
    });

    it('stores zero when process value is null', function () {
        expect($this->fieldtype->process(null))->toBe(0);
    });

    it('accepts canonical unmasked hhmm input from the frontend mask', function () {
        expect($this->fieldtype->process('0130'))->toBe(5_400_000);
    });

    it('clamps out-of-range input to 99:59 before converting to milliseconds', function () {
        expect($this->fieldtype->process('99:99'))->toBe(359_940_000)
            ->and($this->fieldtype->process('1200'))->toBe(43_200_000);
    });
});

describe('configured maxHours: caps parsing and formatting at the configured limit instead of 99', function () {
    it('clamps process() input to the configured max hours', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => 5]);

        expect($fieldtype->process('0930'))->toBe(21_540_000);
    });

    it('clamps preProcess() output to the configured max hours', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => 5]);

        expect($fieldtype->preProcess(900_000_000))->toBe('05:59');
    });

    it('clamps augment() output to the configured max hours', function () {
        $fieldtype = $this->fieldtypeWithConfig(['maxHours' => 5]);

        expect($fieldtype->augment(900_000_000))->toBe('05:59');
    });
});

describe('augment method: defaults to plain hh:mm when no labels are configured', function () {
    it('matches the Control Panel hh:mm display', function () {
        expect($this->fieldtype->augment(5_400_000))->toBe('01:30');
    });

    it('returns 00:00 for null input', function () {
        expect($this->fieldtype->augment(null))->toBe('00:00');
    });

    it('caps augmented output at the field maximum for large durations', function () {
        expect($this->fieldtype->augment(900_000_000))->toBe('99:59');
    });

    it('treats all-blank label config the same as no labels configured at all', function () {
        $fieldtype = $this->fieldtypeWithConfig([
            'hourLabel' => '', 'hourLabelPlural' => '',
            'minuteLabel' => '', 'minuteLabelPlural' => '',
        ]);

        expect($fieldtype->augment(5_400_000))->toBe('01:30');
    });
});

describe('configured labels: switches augment() to human-readable output and localizes the unit words', function () {
    it('omits the hours segment when hours is zero', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'hr']);

        expect($fieldtype->augment(null))->toBe('00 mins')
            ->and($fieldtype->augment(60_000))->toBe('01 min');
    });

    it('omits the minutes segment when minutes is zero', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'hr']);

        expect($fieldtype->augment(3_600_000))->toBe('01 hr')
            ->and($fieldtype->augment(7_200_000))->toBe('02 hrs');
    });

    it('shows both segments when both are non-zero', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'hr']);

        expect($fieldtype->augment(5_400_000))->toBe('01 hr 30 mins')
            ->and($fieldtype->augment(7_260_000))->toBe('02 hrs 01 min');
    });

    it('uses configured singular and plural hour labels', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'heure', 'hourLabelPlural' => 'heures']);

        expect($fieldtype->augment(3_600_000))->toBe('01 heure')
            ->and($fieldtype->augment(7_200_000))->toBe('02 heures');
    });

    it('uses configured singular and plural minute labels', function () {
        $fieldtype = $this->fieldtypeWithConfig(['minuteLabel' => 'minuto', 'minuteLabelPlural' => 'minutos']);

        expect($fieldtype->augment(60_000))->toBe('01 minuto')
            ->and($fieldtype->augment(120_000))->toBe('02 minutos');
    });

    it('uses configured labels for both segments together', function () {
        $fieldtype = $this->fieldtypeWithConfig([
            'hourLabel' => 'Std', 'hourLabelPlural' => 'Std',
            'minuteLabel' => 'Min', 'minuteLabelPlural' => 'Min',
        ]);

        expect($fieldtype->augment(5_400_000))->toBe('01 Std 30 Min');
    });

    it('falls back to the English default for a blank label while another label is configured', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => '', 'minuteLabelPlural' => 'minutos']);

        expect($fieldtype->augment(3_600_000))->toBe('01 hr');
    });
});

describe('configured stripLeadingZero: controls whether augment() zero-pads numbers, only once labels are configured', function () {
    it('is void when no labels are configured, always producing plain zero-padded hh:mm', function () {
        $fieldtype = $this->fieldtypeWithConfig(['stripLeadingZero' => true]);

        expect($fieldtype->augment(3_600_000))->toBe('01:00')
            ->and($fieldtype->augment(5_400_000))->toBe('01:30');
    });

    it('zero-pads numbers by default once a label is configured', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'hr']);

        expect($fieldtype->augment(3_600_000))->toBe('01 hr')
            ->and($fieldtype->augment(5_400_000))->toBe('01 hr 30 mins');
    });

    it('strips the leading zero from single-digit numbers when enabled alongside a configured label', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'hr', 'stripLeadingZero' => true]);

        expect($fieldtype->augment(3_600_000))->toBe('1 hr')
            ->and($fieldtype->augment(5_400_000))->toBe('1 hr 30 mins');
    });

    it('leaves double-digit numbers unaffected when enabled', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => 'hr', 'stripLeadingZero' => true]);

        expect($fieldtype->augment(84_600_000))->toBe('23 hrs 30 mins');
    });
});
