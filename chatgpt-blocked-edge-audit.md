# ChatGPT Blocked-Edge Audit

Audit run: July 31, 2026

Scope: `src/puzzles/chatgpt-levels.json` only.

## Summary

- Total levels: `150`
- Levels containing `blockedEdges`: `105`
- Levels audited for blocked-edge redundancy: `105`
- Levels where removing `blockedEdges` leaves the solution count unchanged: `0`
- Levels where the maze alone equals the final solution count: `0`
- Inconclusive results caused by solver truncation: `0`

Interpretation:

- No remaining level in this collection has redundant `blockedEdges` under this audit.
- No puzzle in this pass had `blockedEdges` doing all the work by themselves.
- The earlier flagged redundant-wall levels have been cleaned up.

## Method

For each ChatGPT level that contains `blockedEdges`:

1. Count valid solutions for the full puzzle.
2. Remove only `blockedEdges` and count again.
3. Count the raw maze-only branching using just `width`, `height`, `start`, `exits`, and `blockedEdges`.

Settings used:

- Full-puzzle cap: `800`
- Branching cap: `1500`
- Full-puzzle expansion budget: `300000`
- Branching expansion budget: `450000`

Flag rule used:

- Mark a level if `solutions == noBlocked`.

## Flagged Levels

| Level | Size | Blocked edges | Full solutions | Maze-only branching | Without blocked edges |
|---|---:|---:|---:|---:|---:|
| None | — | — | — | — | — |

## Next Step

Recommended cleanup order:

The blocked-edge redundancy pass is complete for the current ChatGPT collection snapshot.
