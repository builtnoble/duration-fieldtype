# Duration Fieldtype

> A Statamic fieldtype for storing and displaying time durations. Values are saved as integers in milliseconds, entered via a masked `hh:mm` input in the Control Panel, and output in Antlers templates as either plain `hh:mm` or an optional human-readable string.

## Features

- **Millisecond integer storage** — values are saved as raw integers (e.g. `5400000` for 1 hour 30 minutes), keeping arithmetic and sorting predictable
- **Masked `hh:mm` input** — the Control Panel field renders a masked input that automatically formats digits as hours and minutes, capped at `99:59` by default
- **Configurable max hours** — cap the field below 99 hours (e.g. `8` for a workday tracker) via the field's "Max Hours" setting; minutes always range `00`–`59`
- **Keyboard stepping** — pressing `↑` or `↓` while the field is focused increments or decrements whichever single digit the cursor sits immediately after
- **Paste support** — pasting any text extracts its digits and replaces the field's value, clamped to the field's bounds
- **Truncation to minute** — partial minutes are discarded on load; sub-minute precision is not stored or displayed
- **Antlers ready** — augmented values default to plain `hh:mm` (matching the Control Panel display) unless all four unit labels are configured, in which case they become a human-readable string (e.g. `01 hr 30 mins`, or `1 hr 30 mins` with leading zeros stripped) with the minutes segment omitted entirely when zero
- **Localizable labels** — optionally configure `hr`/`hrs`/`min`/`mins`-style labels per field, so a site can translate them without the addon needing to bundle every language
- **Null-safe** — null values display as `00:00` in the CP and `00 mins` in templates

## Requirements

- PHP 8.3+
- Statamic 6.0+

## How to Install

Install the addon via Composer:

```bash
composer require builtnoble/duration-fieldtype
```

Then add the fieldtype to any blueprint in the Control Panel or directly in `resources/blueprints/`.

## Documentation

See [DOCUMENTATION.md](DOCUMENTATION.md) for configuration options and a full explanation of how the fieldtype works internally.

## Development

```bash
composer test          # Pest (PHP)
composer test:feature  # Pest, feature-grouped only
composer lint           # Pint, check only
composer analyse        # PHPStan
composer check           # lint + analyse + test, all at once
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development setup and workflow.
