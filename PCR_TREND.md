# PCR Intraday Trend

## Goal
Upgrade the existing PCR card from a static value into an intraday sentiment trend signal.

Users should understand not only what PCR is now, but whether sentiment is rising, falling, stable, or flipping during the session.

## Product Principle
This feature must add intelligence beyond the current PCR value. Do not add another static interpretation of PCR. The useful insight is the direction, speed, and context of PCR movement during the active session.

## Implementation Steps
1. Locate the current PCR card or component in the F&O tab.
2. Locate the data source that provides the current PCR value.
3. Check whether intraday historical PCR values already exist in the API response, websocket stream, cache, or local state.
4. If PCR history exists, use the existing source of truth.
5. If PCR history does not exist, create a lightweight client-side rolling series from incoming PCR ticks for the active session.
6. Store timestamped PCR samples in this shape:

```ts
type PcrSample = {
  timestamp: number;
  pcr: number;
};
```

7. Reset or separate the rolling series by trading session so yesterday's PCR movement does not influence today's signal.
8. Calculate:
   - current PCR
   - PCR change over 15 minutes
   - PCR change over 30 minutes
   - PCR change from session open
   - short-term slope
   - trend label
   - confidence or fallback state
9. Add a small sparkline beside or below the PCR value.
10. Keep the current PCR number visually primary.
11. Show `Building trend...` until at least 5 valid samples exist.
12. Avoid trade recommendation language.

## Signal Labels
Use these labels as the first implementation set:

- `Neutral, Rising`
- `Neutral, Falling`
- `Bullish Pressure Rising`
- `Bearish Pressure Rising`
- `Stable`
- `Sharp Sentiment Shift`
- `Building trend...`

## Display Rules
- Show the current PCR value at all times when available.
- Show the trend label only when enough valid samples exist.
- Show the sparkline when at least 5 valid samples exist.
- Show a calm fallback when data is insufficient.
- Do not use strong language for small or noisy changes.
- Do not hide the existing static PCR interpretation unless the design requires it.

## AI Insight Section
Add an AI insight block inside or near the PCR card.

### Format
Use 2-4 short bullet pointers.

Each pointer should explain one crucial behavior:

- What changed.
- Why it matters.
- Whether the signal is strengthening, weakening, stable, or conflicted.

### Pointer Examples
- `PCR remains neutral, but has risen steadily over the last 45 minutes.`
- `Put-side positioning is building faster than the headline PCR suggests.`
- `PCR momentum has cooled after an earlier rise, suggesting sentiment pressure is stabilizing.`
- `Current PCR is flat; no meaningful intraday sentiment shift detected.`

### Trigger Rules
Show AI pointers when:

- PCR trend changes direction.
- PCR moves sharply over 15 minutes or 30 minutes.
- Current PCR label conflicts with intraday direction, such as `Neutral` but rising fast.
- PCR stabilizes after a strong move.

Do not show strong AI language if fewer than 5 valid samples exist.

## Copy Rules
Allowed language:

- `suggests`
- `indicates`
- `shows`
- `pressure`
- `stabilizing`
- `weakening`
- `sentiment shift`

Avoid:

- `buy`
- `sell`
- `go long`
- `go short`
- `entry`
- `target`
- `stop loss`

## Edge Cases
- If PCR is unavailable, keep the current fallback behavior and do not render fake trend data.
- If samples are irregular, calculate trend from timestamps rather than array position.
- If PCR spikes because of one bad tick, avoid changing the label until the move is confirmed by subsequent samples.
- If the market session changes, start a fresh intraday trend series.

## Acceptance Criteria
- PCR trend updates during the active session.
- Static PCR value remains visible.
- Sparkline appears when enough data exists.
- AI insight explains crucial PCR behavior in bullets.
- Insufficient data produces a calm fallback state.
- No trade recommendations are shown.

