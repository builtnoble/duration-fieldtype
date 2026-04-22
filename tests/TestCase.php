<?php

namespace Builtnoble\DurationFieldtype\Tests;

use Builtnoble\DurationFieldtype\Fieldtypes\Duration;
use Builtnoble\DurationFieldtype\ServiceProvider;
use Statamic\Fields\Field;
use Statamic\Testing\AddonTestCase;

abstract class TestCase extends AddonTestCase
{
    protected string $addonServiceProvider = ServiceProvider::class;

    protected Duration $fieldtype;

    protected function setUp(): void
    {
        parent::setUp();

        $field = new Field('duration', [
            'type' => 'duration',
        ]);

        $this->fieldtype = new Duration;
        $this->fieldtype->setField($field);
    }
}
