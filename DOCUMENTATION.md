# Duration Fieldtype Documentation

## Configuration

| Option | Description | Default |
| --- | --- | --- |
| **Max Hours** | The maximum number of hours the field allows, from `0` to `99`. Out-of-range values are clamped rather than rejected. Minutes aren't configurable and always range `00`–`59`. | `99` |
| **Hour/Minute Label (Singular / Plural)** | Localizes `augment()`'s output into a human-readable string (e.g. `heure`/`heures`). All four fields must be set for this to take effect — leaving any one blank keeps output as plain `hh:mm`, since mixing a custom word with an assumed English one would defeat the point of localizing. | blank (plain `hh:mm` output) |
| **Strip Leading Zero** | Removes the leading zero from single-digit numbers in the human-readable output (`3 hrs` instead of `03 hrs`). Hidden in the Control Panel, and has no effect, until all four labels above are set. | `false` |

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

### Display

By default, augmenting a stored value produces the same plain `hh:mm` string shown in the Control Panel:

```antlers
{{ input_name }}
{{# Output: 01:30 #}}
```

Once all four Hour/Minute Label settings are configured, it instead produces a human-readable string, omitting whichever segment is zero:

```antlers
{{ input_name }}
{{# Output: 01 hr 30 mins #}}
```

Strip Leading Zero drops the `0` from single-digit numbers in that human-readable output (`1 hr 30 mins`).

### Input masking and editing

The CP field renders a masked text input using [Maska](https://beholdr.github.io/maska/). Typing a digit overwrites whichever slot (hours/minutes, tens/ones) the caret sits at and advances to the next, like a segmented date/time input, rather than re-deriving the value from the last 4 digits typed anywhere in the field. The `↑`/`↓` arrow keys similarly step whichever digit the caret sits immediately after. A value typed or stepped past the field's bounds is clamped rather than accepted as-is.

Pasting replaces the field's entire value: non-digit characters are stripped, only the last 4 digits are read, and the result is clamped the same way typed input is.

### Value bounds

| Bound | Value |
| --- | --- |
| Maximum | `99:59` by default, or `{Max Hours}:59` |
| Minimum | `00:00` |
| Precision | 1 minute (60,000 ms) |

### Null and empty handling

`preProcess` and `preProcessIndex` handle `null` by returning `00:00`. `augment` returns `00:00` (or `00 mins`, once labels are configured) for null or zero values.
