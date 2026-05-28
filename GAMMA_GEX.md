# Estimated Gamma Regime / GEX

## Goal
Add an estimated gamma regime signal that explains whether options positioning may be stabilizing or amplifying Nifty movement.

Users should understand whether the current options structure suggests dampened movement, expansion risk, or a nearby gamma flip zone.

## Product Principle
This feature must describe an estimated market behavior regime, not claim exact dealer positioning. The useful insight is whether the options structure may be making Nifty more stable or more movement-prone.

## Important Framing
Do not present this as exact dealer positioning. Use careful labels:

- `Estimated Gamma Regime`
- `Estimated Gamma Pressure`
- `Gamma Flip Zone`

Avoid saying `dealers are long` or `dealers are short` unless the system has verified positioning data.

## Implementation Steps
1. Locate option-chain data containing strikes, call OI, put OI, IV, expiry, and spot price.
2. Confirm whether Greeks are already calculated in the codebase or API response.
3. If gamma already exists, use the existing gamma source.
4. If gamma does not exist, add or reuse a Black-Scholes gamma helper using:
   - spot price
   - strike price
   - implied volatility
   - time to expiry
   - risk-free rate fallback
5. Estimate strike-level gamma exposure using:
   - strike gamma
   - open interest
   - contract multiplier
   - spot price
6. Calculate estimated gamma pressure by strike.
7. Calculate estimated net gamma pressure near spot.
8. Identify:
   - current gamma regime: `Positive`, `Negative`, or `Neutral`
   - regime direction: `Stabilizing`, `Weakening`, or `Expansion Risk`
   - nearest gamma flip zone
   - confidence or fallback state
9. Add a compact card to the F&O intelligence area.
10. Add cautious explanation copy.
11. Add a tooltip or disclaimer:

```txt
Estimated from public options-chain data; actual positioning may differ.
```

12. Avoid presenting GEX as a precise fact.

## Display Rules
- Primary label: `Estimated Gamma Regime`
- State examples:
  - `Positive Gamma · Stabilizing`
  - `Negative Gamma · Expansion Risk`
  - `Near Gamma Flip`
- Show nearest flip level only when confidence is sufficient.
- Hide flip level if calculation is unstable or data is incomplete.
- Prefer a compact regime card over a large chart for the first version.
- Do not duplicate existing OI support and resistance levels.

## AI Insight Section
Add an AI insight block inside or near the gamma card.

### Format
Use 2-4 short bullet pointers.

Each pointer should explain one crucial behavior:

- What the estimated gamma regime is.
- Whether gamma pressure is strengthening or weakening.
- Whether spot is near a behavior-change zone.
- Whether price behavior conflicts with the estimated regime.

### Pointer Examples
- `Estimated gamma is positive near spot, suggesting movement may be dampened.`
- `Nifty is trading close to the estimated gamma flip zone, where market behavior can shift.`
- `Gamma pressure has weakened intraday, increasing the chance of wider price movement.`
- `Negative gamma pressure is building below spot, indicating expansion risk if price slips further.`

### Trigger Rules
Show AI pointers when:

- Gamma regime changes between positive, neutral, and negative.
- Spot moves close to the estimated gamma flip zone.
- Estimated gamma pressure strengthens or weakens meaningfully.
- Gamma state conflicts with price behavior, such as positive gamma but expanding candles.

Always include cautious language: `estimated`, `suggests`, `may`, or `can`.

## Copy Rules
Allowed language:

- `estimated`
- `suggests`
- `may`
- `can`
- `stabilizing`
- `weakening`
- `expansion risk`
- `gamma flip zone`

Avoid:

- `dealers are long`
- `dealers are short`
- `will move`
- `guarantees`
- `buy`
- `sell`
- `go long`
- `go short`
- `entry`
- `target`
- `stop loss`

## Edge Cases
- If IV is missing for a strike, exclude that strike or use the codebase's established fallback.
- If expiry is too close and calculations become unstable, reduce confidence or show a fallback state.
- If spot is far from all meaningful gamma concentrations, show the regime without forcing a flip-zone callout.
- If gamma cannot be calculated safely, show `Estimated gamma unavailable` rather than a guessed signal.

## Acceptance Criteria
- Signal uses cautious `estimated` language.
- Card explains market behavior, not trading instruction.
- Missing IV or Greek data produces safe fallback states.
- AI insight highlights crucial gamma behavior in bullets.
- The feature does not duplicate existing OI support and resistance levels.

