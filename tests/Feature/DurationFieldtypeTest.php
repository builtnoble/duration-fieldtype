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

        expect($fieldtype->augment(900_000_000))->toBe('05 hrs 59 mins');
    });
});

describe('augment method: transforms stored milliseconds for Antlers template output', function () {
    it('shows only mins when hours is zero', function () {
        expect($this->fieldtype->augment(null))->toBe('00 mins')
            ->and($this->fieldtype->augment(60_000))->toBe('01 min');
    });

    it('shows only hrs when minutes is zero', function () {
        expect($this->fieldtype->augment(3_600_000))->toBe('01 hr')
            ->and($this->fieldtype->augment(7_200_000))->toBe('02 hrs');
    });

    it('shows both hrs and mins when both are non-zero', function () {
        expect($this->fieldtype->augment(5_400_000))->toBe('01 hr 30 mins')
            ->and($this->fieldtype->augment(7_260_000))->toBe('02 hrs 01 min');
    });
});

describe('configured labels: localizes the unit labels used in augment() output', function () {
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

    it('falls back to the English defaults for an empty configured label', function () {
        $fieldtype = $this->fieldtypeWithConfig(['hourLabel' => '']);

        expect($fieldtype->augment(3_600_000))->toBe('01 hr');
    });

    it('falls back to the English defaults when labels are not configured', function () {
        expect($this->fieldtype->augment(3_600_000))->toBe('01 hr')
            ->and($this->fieldtype->augment(60_000))->toBe('01 min');
    });
});
