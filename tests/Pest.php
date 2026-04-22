<?php

use Builtnoble\DurationFieldtype\Tests\TestCase;

pest()->project()->github('builtnoble/duration-fieldtype');

pest()->extend(TestCase::class)
    ->group('feature')
    ->in('Feature');
