# rmgr-viewer: how it works

Plain-language explanations of how rmgr-viewer analyzes SSB64 replays, written for the competitive community. Each document explains what the app measures, how, and why — without needing to read the code — and ends with open questions we'd like feedback on.

## Documents

- [How edge guards are defined and scored](edge-guards.md)

## Planned

- Recovery: how "Recovery %" is counted, and how the recovery simulator decides whether a recovery was possible
- Neutral: how openings are detected and attributed ("why each opening happened"), and neutral wins per stock
- Combos and kill combos: what counts as a combo, true combos vs. short gaps, and when a combo counts as a KO
- Ledge play: ledge getups and ledge trapping
- Sessions and 12-character battles: how games are grouped, rotating lobbies, and 12CB detection
- Opponent strength and matchup baselines: how opponents are tiered and how small samples are handled
- Clip search: what each search type finds

## Feedback

Every document ends with specific questions. If you think something is measured wrong, the most useful thing to send is the **replay file name and the frame number** where the app's call doesn't match what happened.
