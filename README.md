# Duration Fieldtype

> A Statamic fieldtype for storing and displaying time durations. Values are saved as integers in milliseconds, entered via a masked `hh:mm` input in the Control Panel, and output as a human-readable string in Antlers templates.

## Features

- **Millisecond integer storage** — values are saved as raw integers (e.g. `5400000` for 1 hour 30 minutes), keeping arithmetic and sorting predictable
- **Masked `hh:mm` input** — the Control Panel field renders a masked input that automatically formats digits as hours and minutes, capped at `99:59`
- **Keyboard stepping** — pressing `↑` or `↓` while the field is focused increments or decrements whichever single digit the cursor sits immediately after
- **Paste support** — pasting any text extracts its digits and replaces the field's value, clamped to the field's bounds
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

With focus inside the duration field, the `↑` and `↓` arrow keys increment or decrement whichever single digit the cursor sits immediately after (hours tens, hours ones, minutes tens, or minutes ones), independently of the other digit in that pair. A caret with no digit right before it (the very start of the field, or just after the `:`) doesn't step anything.

- `02:59` → caret right after the first digit → ↑ → `12:59` (only the hours tens digit changes)
- `12:59` → caret right after the second digit → ↑ → `13:59` (only the hours ones digit changes)
- `00:55` → caret right after the third digit → ↑ → `00:05` (incrementing past the field maximum restarts the digit at 0, rather than producing an invalid `00:65`)
- `99:00` → caret right after the first digit → ↑ → `09:00` (a digit hitting its own maximum of 9 also restarts at 0)
- `00:00` → caret right after any digit → ↓ → wraps to the digit's maximum instead of going negative

### Pasting

Pasting into the field replaces its entire value rather than inserting at the caret. Non-digit characters in the pasted text (spaces, colons, letters, etc.) are stripped before parsing, so pasting `1:30 PM` or `0130` both produce `01:30`. Only the last 4 digits of a longer paste are read, and the result is clamped to the field's bounds the same way typed input is.

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
