# ADR 012: Do not automatically clear copied secret values

## Status

Accepted

## Context

The console copies secret values with the browser Clipboard API and confirms the action with
the standard `Copied to clipboard` toast. Automatically clearing the clipboard later would
require reading it first so the console does not overwrite unrelated content copied in the
meantime. Browsers may deny `navigator.clipboard.readText()` outside a user gesture or prompt
for additional permission, making a delayed clear unreliable.

## Decision

The console will not schedule clipboard clearing. Copy actions continue to use
`navigator.clipboard.writeText()` and the standard confirmation toast. Revealed values in the
UI are independently re-masked after 30 seconds.

## Consequences

- The console never clobbers newer clipboard content.
- Users receive honest confirmation that a value was copied, without implying it will be
  removed automatically.
- Clipboard lifetime remains controlled by the browser, operating system, and clipboard
  manager.
