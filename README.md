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

## How to Install

Install the addon via Composer:

```bash
composer require builtnoble/duration-fieldtype
```

Then add the fieldtype to any blueprint in the Control Panel or directly in `resources/blueprints/`.

## Configuration

- **Max Hours** — the maximum number of hours the field allows, from `0` to `99` (default `99`). A value outside that range is clamped rather than rejected. Minutes are not configurable and always range `00`–`59`.
- **Hour Label (Singular / Plural)** and **Minute Label (Singular / Plural)** — all blank by default. `augment()` only switches from plain `hh:mm` to a human-readable string once **all four** of these fields are filled in; leaving any one blank (including a config left over from before this option existed) keeps output as plain `hh:mm`. This is a deliberate all-or-nothing rule: configuring only the hour labels and leaving minutes blank would otherwise silently mix a custom hour word with an assumed English minute word, which defeats the point of localizing in the first place. This is a lightweight localization mechanism: rather than the addon bundling a translation for every language, a site can set these to whatever its own language needs (e.g. `heure`/`heures`), including setting the singular and plural fields to the same value for a language that doesn't distinguish them. It covers the common "different word/suffix for exactly one vs. more than one" pattern; it isn't a full pluralization engine, so languages with more than two plural forms aren't represented exactly.
- **Strip Leading Zero** — off by default (`03 hrs`, `05 mins`), and hidden in the Control Panel until all four label fields above are filled in (it has nothing to act on before then). Enabling it removes the leading zero from single-digit numbers in the human-readable `augment()` output (`3 hrs`, `5 mins`); it has no effect on the Control Panel input either way.

## How It Works

### Fieldtype lifecycle methods

This fieldtype uses the standard Statamic fieldtype lifecycle and maps each method to a specific responsibility:

- **`preload()`**
  - provides metadata to the Vue component: the configured `maxHours` cap and the fixed `maxMinutes` cap
- **`preProcess($value)`**
  - converts stored milliseconds to a zero-padded `hh:mm` string for the CP edit form
- **`process($value)`**
  - parses the masked `hh:mm` or canonical `hhmm` digit input from the Vue component and converts it to an integer number of milliseconds for storage
- **`preProcessIndex($value)`**
  - converts stored milliseconds to `hh:mm` for display in Control Panel index listings
- **`augment($value)`**
  - converts stored milliseconds to plain `hh:mm`, or a human-readable string once all four unit labels are configured, for Antlers template output

### Storage

Values are stored as plain integers representing the duration in milliseconds. A value entered as `01:30` is saved as `5400000`. Empty input is normalized to `0` on save.

### Display in templates

By default, augmenting a stored value for Antlers produces the same plain `hh:mm` string shown in the Control Panel:

```antlers
{{ duration }}
{{# Examples:
    0        → 00:00
    5400000  → 01:30
    7320000  → 02:02
#}}
```

Once all four Hour/Minute Label settings are configured, `augment()` instead produces a human-readable string with singular/plural labels, omitting whichever segment is zero:

```antlers
{{ duration }}
{{# Examples (Hour Label set to "hr"):
    0        → 00 mins          (0 mins with Strip Leading Zero enabled)
    60000    → 01 min           (1 min)
    5400000  → 01 hr 30 mins    (1 hr 30 mins)
    3600000  → 01 hr            (1 hr)
    7200000  → 02 hrs           (2 hrs)
    7320000  → 02 hrs 02 mins   (2 hrs 2 mins)
#}}
```

Both segments follow singular/plural rules independently. When hours is zero only the minutes segment is shown; when minutes is zero only the hours segment is shown.

### Input masking

The CP field renders a masked text input using [Maska](https://beholdr.github.io/maska/). The unmasked canonical value (four digits, `hhmm`) is what gets sent to `process()` on save.

Typing a digit overwrites whichever slot (hours tens, hours ones, minutes tens, or minutes ones) the caret currently sits at and advances to the next slot, like a fixed-width segmented date/time input, rather than inserting the character into the raw text and re-deriving the value from the last 4 digits typed anywhere. A digit typed past the field's maximum is clamped to that maximum rather than accepted as-is (e.g. typing `9` into the hours ones digit with a Max Hours of `8` produces `08`, not `09`).

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

| Bound           | Value                                   |
| --------------- | ---------------------------------------- |
| Maximum display | `99:59` by default, or `{Max Hours}:59` |
| Minimum display | `00:00`                                 |
| Precision       | 1 minute (60,000 ms)                    |

### Null and empty handling

Both `preProcess` and `preProcessIndex` handle `null` defensively by returning `00:00`. `augment` returns `00:00` (or `00 mins`, once all labels are configured) for null or zero values so templates always receive a non-empty string.

## Running Tests

```bash
composer test
```
