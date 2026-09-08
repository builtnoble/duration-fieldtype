# Duration Fieldtype

> A Statamic fieldtype for storing and displaying time durations. Values are saved as integers in milliseconds, entered via a masked `hh:mm` input in the Control Panel, and output as a human-readable string in Antlers templates.

## Features

- **Millisecond integer storage** — values are saved as raw integers (e.g. `5400000` for 1 hour 30 minutes), keeping arithmetic and sorting predictable
- **Masked `hh:mm` input** — the Control Panel field renders a masked input that automatically formats digits as hours and minutes, capped at `99:59`
- **Keyboard stepping** — pressing `↑` or `↓` while the field is focused increments or decrements whichever segment (hours or minutes) the cursor is in
- **Truncation to minute** — partial minutes are discarded on load; sub-minute precision is not stored or displayed
- **Antlers ready** — augmented values are returned as a human-readable string (e.g. `01 hr 30 mins`) with singular and plural labels, and the minutes segment is omitted entirely when zero
- **Null-safe** — null values display as `00:00` in the CP and `00 mins` in templates

## How to Install

Install the addon via Composer:

```bash
composer require builtnoble/duration-fieldtype
```

Then add the fieldtype to any blueprint in the Control Panel or directly in `resources/blueprints/`.

## How It Works

### Fieldtype lifecycle methods

This fieldtype uses the standard Statamic fieldtype lifecycle and maps each method to a specific responsibility:

- **`preload()`**
  - provides metadata to the Vue component (currently the `maxHours` cap)
- **`preProcess($value)`**
  - converts stored milliseconds to a zero-padded `hh:mm` string for the CP edit form
- **`process($value)`**
  - parses the masked `hh:mm` or canonical `hhmm` digit input from the Vue component and converts it to an integer number of milliseconds for storage
- **`preProcessIndex($value)`**
  - converts stored milliseconds to `hh:mm` for display in Control Panel index listings
- **`augment($value)`**
  - converts stored milliseconds to a human-readable string for Antlers template output

### Storage

Values are stored as plain integers representing the duration in milliseconds. A value entered as `01:30` is saved as `5400000`. Empty input is normalized to `0` on save.

### Display in templates

When a stored value is augmented for use in Antlers templates, it is formatted as a human-readable string with singular/plural labels:

```antlers
{{ duration }}
{{# Examples:
    0        → 00 mins
    60000    → 01 min
    5400000  → 01 hr 30 mins
    3600000  → 01 hr
    7200000  → 02 hrs
    7320000  → 02 hrs 02 mins
#}}
```

Both segments follow singular/plural rules independently. When hours is zero only the minutes segment is shown; when minutes is zero only the hours segment is shown.

### Input masking

The CP field renders a masked text input using [Maska](https://beholdr.github.io/maska/). As digits are typed, the display is reformatted live to `hh:mm`. The unmasked canonical value (four digits, `hhmm`) is what gets sent to `process()` on save.

### Keyboard stepping

With focus inside the duration field, the `↑` and `↓` arrow keys increment or decrement whichever segment the cursor is currently in.

Cursor in the minutes segment (carries into hours, like a clock):

- `02:59` → ↑ → `03:00`
- `03:00` → ↓ → `02:59`
- `99:59` → ↑ → `99:59` (capped)
- `00:00` → ↓ → `00:00` (floored)

Cursor in the hours segment (only the hours change):

- `02:59` → ↑ → `03:59`
- `03:59` → ↓ → `02:59`
- `99:59` → ↑ → `99:59` (capped)
- `00:30` → ↓ → `00:30` (floored)

### Value bounds

| Bound           | Value                |
| --------------- | -------------------- |
| Maximum display | `99:59`              |
| Minimum display | `00:00`              |
| Precision       | 1 minute (60,000 ms) |

### Null and empty handling

Both `preProcess` and `preProcessIndex` handle `null` defensively by returning `00:00`. `augment` returns `00 mins` for null or zero values so templates always receive a non-empty string.

## Running Tests

```bash
composer test
```
