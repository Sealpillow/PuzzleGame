"""
Dev-time authoring tool for themaze/ levels (not shipped as part of the game
— the game only ever fetches the .svg files this script writes). Mirrors
generate-levels.mjs (the canonical Node version, matching the sibling
thewitness/ project's tooling convention) — keep the two in sync if you
edit level specs. This Python version exists because the environment this
was authored in has Python but no Node, so it's also the tool that actually
produced the checked-in .svg files; run it after any spec change:

    python scripts/generate_levels.py

Levels are specified as a compact char grid + a per-level legend, verified
solvable (and checked for load-bearing doors) by a small BFS reusing the
exact same door rules as src/engine/Door.js, then emitted as real .svg
files whose data-* attributes LevelLoader.js parses at runtime and whose
shapes are the literal visuals the game renders.
"""

import json
import os
from collections import deque

TILE = 40
DIRS = {'N': (0, -1), 'S': (0, 1), 'E': (1, 0), 'W': (-1, 0)}
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LEVELS_DIR = os.path.join(SCRIPT_DIR, '..', 'src', 'levels')


def pad(rows, width):
    return [r.ljust(width, '#') for r in rows]


# Capstone demo's grid is built from computed row strings (not hand-typed
# literals) specifically to avoid the character-counting mistakes earlier
# levels hit — defined here since Python needs it before LEVELS references it.
_CAPSTONE_WIDTH = 17
_CAPSTONE_ROWS = [
    '#' * _CAPSTONE_WIDTH,
    '#' + 'S' + ' ' * 3 + '>' + ' ' * 2 + '#' * 9,        # x1=S, x2-4 floor, x5 oneway(E), x6-7 floor
    '#' * 3 + ' ' + '#' * 3 + ' ' + '#' * 9,               # x3 floor (down to trigger), x7 floor (down to fork shaft)
    '#' * 3 + 'T' + '#' * 3 + ' ' + '#' * 9,               # x3 trigger (dead end), x7 floor (shaft)
    '#' * 7 + ' ' + '#' * 9,                                # x7 floor (shaft)
    '#' * 5 + 'A' + ' ' * 3 + 'B' + '#' * 7,               # x5 linked A, x6-8 floor, x9 linked B
    '#' * 5 + ' ' + '#' * 3 + ' ' + '#' * 7,               # x5 floor (A's dead end), x9 floor (B continues)
    '#' * 9 + ' ' * 2 + 'X' + ' ' * 2 + 'V' + ' ' + 'E',   # x9-10 floor, x11 closing, x12-13 floor, x14 toggle, x15 floor, x16 exit
    '#' * _CAPSTONE_WIDTH,
]
assert all(len(r) == _CAPSTONE_WIDTH for r in _CAPSTONE_ROWS), [len(r) for r in _CAPSTONE_ROWS]


def _place(width, height, cells):
    """Build row strings from explicit {(x, y): char} placements - every
    unlisted cell defaults to wall. Safer than hand-typing or concatenating
    row strings for anything bigger than a couple of features per row."""
    grid = [['#'] * width for _ in range(height)]
    for (x, y), ch in cells.items():
        grid[y][x] = ch
    return [''.join(row) for row in grid]


# capstone-2's grid: a hub with three genuinely independent spokes, doable
# in ANY order (freely revisiting the hub between them) rather than one
# fixed sequence:
#   - north spoke: a plain dead-end detour to trigger T1 (blue)
#   - west spoke: a one-way LOOP (enter only via the hub's west door, exit
#     only via the door that rejoins the entry corridor) past trigger T2
#     (orange) - committed once started, but startable whenever you like
#   - east spoke: a linked fork (P trap / Q real) leading to the only
#     corridor onward - crossing Q does not seal itself, so it can be
#     re-crossed freely to return to the hub and do the other spokes
# All three can be done before or after each other in any order; the ONLY
# irreversible moment in the whole level is the one-way door well past the
# fork, gating the final corridor where both toggle doors + the closing
# door live. Built via explicit (x, y) placement, not row strings, since a
# hub topology isn't expressible as a sequence of row segments at all.
_CAPSTONE2_CELLS = {
    # Entry corridor (south of the hub) + the hub cell itself
    (10, 9): 'S',
    (10, 8): ' ', (10, 7): ' ', (10, 6): ' ',
    (10, 5): ' ',  # hub

    # North spoke: plain dead-end detour to T1 (blue trigger)
    (10, 4): ' ', (10, 3): 'T',

    # West spoke: one-way loop past T2 (orange trigger), rejoining the
    # entry corridor at (10,7) via a door that only opens moving east -
    # entering this loop is only possible via the hub's west door, and the
    # only way out is all the way around.
    (9, 5): '<',                      # oneway dir=W, hub's west door
    (8, 5): ' ', (7, 5): ' ',
    (6, 5): 't',                      # T2, mid-loop (not a dead end)
    (6, 6): ' ', (6, 7): ' ',
    (7, 7): ' ', (8, 7): ' ',
    (9, 7): '>',                      # oneway dir=E, rejoins (10,7)

    # East spoke: connector to the linked fork
    (11, 5): ' ', (12, 5): ' ', (13, 5): ' ',
    (14, 5): ' ',                     # fork hub
    (14, 4): ' ', (14, 3): 'P',       # P (trap), dead end beyond it
    (14, 2): ' ',
    (14, 6): ' ', (14, 7): 'Q',       # Q (real), continues beyond it
    (14, 8): ' ',

    # Final corridor: only reachable via Q, gated by a one-way commitment,
    # then both toggle doors (need T1 and T2 respectively) and a closing
    # door before the exit.
    (14, 9): ' ', (15, 9): ' ',
    (16, 9): '>',                     # oneway dir=E, the true point of no return
    (17, 9): ' ',
    (18, 9): 'B',                     # toggle, blue (needs T1)
    (19, 9): ' ',
    (20, 9): 'b',                     # toggle, orange (needs T2)
    (21, 9): ' ',
    (22, 9): 'X',                     # closing
    (23, 9): ' ',
    (24, 9): 'E',
}
_CAPSTONE2_ROWS = _place(26, 11, _CAPSTONE2_CELLS)


# capstone-3 ("No Second Chances"): everything so far, but cross-wired so a
# single decision made early is only paid off much later, after several
# other irreversible commitments have already stacked on top of it. Four
# zones, each individually simple, chained so the WHOLE route has to be
# planned from the board before the first step:
#
#   Zone A - entry: an easy-to-miss dead-end detour to trigger T (blue),
#     then a one-way commitment.
#   Zone B - fork 1 (linked P/Q): P is a dead end that also permanently
#     seals Q. Q continues to a toggle door that needed T (from Zone A) -
#     miss the detour, and this is exactly as far as the run goes.
#   Zone C - a second easy-to-miss detour, this time to trigger t (orange,
#     independent of blue), followed by a "Don't Trust Your Eyes"-style
#     fork: a short one-way branch that looks plausible and dead-ends, and
#     a longer real one-way branch.
#   Zone D - fork 2 (linked R/U, same trap-shape as fork 1), then a second
#     toggle door that needed t (from Zone C), then a closing door, then
#     the exit.
#
# Every one-way door and every linked "wrong" branch is a hard, permanent
# commitment - there is no backtracking anywhere in this level once you've
# moved past one. Getting to Zone D having skipped either detour, or
# picked either trap branch, means Restart is the only way out.
_NO_SECOND_CHANCES_CELLS = {
    # Zone A: entry, T (blue) detour, one-way commitment
    (1, 1): 'S',
    (2, 1): ' ', (3, 1): ' ', (4, 1): ' ', (5, 1): ' ',
    (6, 1): '>',                              # D1, oneway dir=E
    (7, 1): ' ', (8, 1): ' ', (9, 1): ' ', (10, 1): ' ',
    (2, 2): ' ', (2, 3): 'T',                 # blue trigger, easy to skip

    # Zone B: shaft down to fork 1's hub, the fork itself, and the toggle
    # door gating the way out (needs T)
    (10, 2): ' ', (10, 3): ' ', (10, 4): ' ',
    (8, 5): 'P', (9, 5): ' ', (10, 5): ' ', (11, 5): ' ', (12, 5): 'Q',
    (8, 6): ' ',                              # P's dead end
    (12, 6): ' ', (12, 7): ' ',
    (12, 8): 'B',                             # toggle, blue - needs T
    (12, 9): ' ',

    # Zone C: turn toward hub 2, the misdirection fork (short trap north /
    # long real east), and the t (orange) detour off the long branch
    (13, 9): ' ', (14, 9): ' ', (15, 9): ' ',  # hub 2
    (15, 8): '^', (15, 7): ' ',                # trap: oneway dir=N, dead end
    (16, 9): '>', (17, 9): ' ', (18, 9): ' ',  # real: oneway dir=E
    (18, 10): ' ', (18, 11): 't',              # orange trigger, easy to skip
    (19, 9): ' ', (20, 9): ' ',

    # Zone D: shaft down to fork 2's hub, the fork itself, the toggle door
    # gating the way out (needs t), the closing door, and the exit
    (20, 10): ' ', (20, 11): ' ',
    (18, 12): 'R', (19, 12): ' ', (20, 12): ' ', (21, 12): ' ', (22, 12): 'U',
    (18, 13): ' ',                             # R's dead end
    (22, 13): ' ',
    (22, 14): 'b',                             # toggle, orange - needs t
    (22, 15): ' ',
    (22, 16): 'X',                             # closing
    (22, 17): ' ',
    (22, 18): 'E',
}
_NO_SECOND_CHANCES_ROWS = _place(24, 20, _NO_SECOND_CHANCES_CELLS)


# ---------------------------------------------------------------------------
# Level specs
# ---------------------------------------------------------------------------
# rows: list of strings. Fixed chars: '#' wall, ' '/'.' floor, 'S' start,
# 'E' exit. Every other char must have a `legend` entry:
#   oneway  {'type':'oneway', 'dir':'N'|'S'|'E'|'W'}   dir = required travel direction to enter
#   closing {'type':'closing'}
#   limited {'type':'limited', 'uses':N}
#   linked  {'type':'linked', 'linkId':'a'}             exactly two cells share a linkId
#   toggle  {'type':'toggle', 'groupId':'blue', 'initialOpen':True|False}
#   trigger {'type':'trigger', 'groupId':'blue'}        always-passable floor tile

LEVELS = [
    dict(id='tutorial-1', chapter='tutorial', title='First Steps', rows=[
        '#########',
        '#S      #',
        '# ##### #',
        '#      E#',
        '#########',
    ], legend={}),

    dict(id='oneway-1', chapter='oneway', title='No Turning Back', rows=[
        '#########',
        '#S  >   #',
        '####### #',
        '#######E#',
        '#########',
    ], legend={'>': {'type': 'oneway', 'dir': 'E'}}),

    # oneway-2's deduction hook: the exit sits directly above the SHORT
    # branch's dead end, close enough to look like the obvious way there.
    # Tracing the actual walls shows column x=1 is cut between y=5 and y=3
    # (no floor at (1,4)) - the short branch is a true dead end, and the
    # real route is the long way around through the other one-way door.
    # Both branches gate on one-way doors, so guessing wrong is a hard
    # Restart, not just a wasted move: once you're a tile past either door,
    # re-entering it against the flow is blocked.
    dict(id='oneway-2', chapter='oneway', title="Don't Trust Your Eyes", rows=_place(10, 9, {
        (5, 7): 'S',
        (5, 6): ' ',
        (5, 5): ' ',  # hub
        (4, 5): '<', (3, 5): ' ', (2, 5): ' ', (1, 5): ' ',  # short branch: dead end
        (6, 5): '>', (7, 5): ' ', (8, 5): ' ',               # long branch: loops around...
        (8, 4): ' ', (8, 3): ' ',
        (7, 3): ' ', (6, 3): ' ', (5, 3): ' ', (4, 3): ' ', (3, 3): ' ', (2, 3): ' ',
        (1, 3): 'E',                                          # ...to the exit, right above the trap
    }), legend={'<': {'type': 'oneway', 'dir': 'W'}, '>': {'type': 'oneway', 'dir': 'E'}}),

    dict(id='closing-1', chapter='closing', title='The Sealed Door', rows=[
        '###########',
        '#S    X   #',
        '######### #',
        '#########E#',
        '###########',
    ], legend={'X': {'type': 'closing'}}),

    dict(id='closing-2', chapter='closing', title='Before You Go', rows=[
        '#############',
        '#S    X     #',
        '### ####### #',
        '### ####### #',
        '########### #',
        '########### #',
        '###########E#',
    ], legend={'X': {'type': 'closing'}}),

    dict(id='limited-1', chapter='limited', title='Two Crossings', rows=pad([
        '###########',
        '#    #    #',
        '#  S 2  E  #',
        '#    #    #',
        '###########',
    ], 11), legend={'2': {'type': 'limited', 'uses': 2}}),

    dict(id='limited-2', chapter='limited', title='Spend Wisely', rows=[
        '#########',
        '##A S B##',
        '## # # ##',
        '##.###E##',
        '#########',
    ], legend={'A': {'type': 'limited', 'uses': 1}, 'B': {'type': 'limited', 'uses': 1}}),

    dict(id='linked-1', chapter='linked', title='Choose a Branch', rows=[
        '#########',
        '##A S B##',
        '## # # ##',
        '##.###E##',
        '#########',
    ], legend={'A': {'type': 'linked', 'linkId': 'ab'}, 'B': {'type': 'linked', 'linkId': 'ab'}}),

    dict(id='linked-2', chapter='linked', title='What You Give Up', rows=[
        '#############',
        '#S       ',
        '######## ',
        '######A   B##',
        '######E###.##',
        '#############',
    ], legend={'A': {'type': 'linked', 'linkId': 'ab'}, 'B': {'type': 'linked', 'linkId': 'ab'}}),

    dict(id='toggle-1', chapter='toggle', title='Flip the Route', rows=[
        '#######',
        '#S T  #',
        '##### #',
        '#  B  #',
        '# #####',
        '#    E#',
        '#######',
    ], legend={'T': {'type': 'trigger', 'groupId': 'blue'}, 'B': {'type': 'toggle', 'groupId': 'blue', 'initialOpen': False}}),

    dict(id='toggle-2', chapter='toggle', title='Two Switches', rows=[
        '#########',
        '#S T  B #',
        '####### #',
        '#  b  t #',
        '# #######',
        '#E#######',
    ], legend={
        'T': {'type': 'trigger', 'groupId': 'blue'},
        'B': {'type': 'toggle', 'groupId': 'blue', 'initialOpen': False},
        't': {'type': 'trigger', 'groupId': 'orange'},
        'b': {'type': 'toggle', 'groupId': 'orange', 'initialOpen': False},
    }),

    dict(id='combo-1', chapter='combo', title='Commit and Follow Through', rows=[
        '###########',
        '#S >X  ',
        '###### ',
        '####A   B##',
        '####.###E##',
        '###########',
    ], legend={
        '>': {'type': 'oneway', 'dir': 'E'},
        'X': {'type': 'closing'},
        'A': {'type': 'linked', 'linkId': 'ab'},
        'B': {'type': 'linked', 'linkId': 'ab'},
    }),

    dict(id='combo-2', chapter='combo', title='Budget the Route', rows=[
        '#############',
        '#S T  B 2   #',
        '########### #',
        '###########v#',
        '###########E#',
    ], legend={
        'T': {'type': 'trigger', 'groupId': 'blue'},
        'B': {'type': 'toggle', 'groupId': 'blue', 'initialOpen': False},
        '2': {'type': 'limited', 'uses': 2},
        'v': {'type': 'oneway', 'dir': 'S'},
    }),

    dict(id='combo-3', chapter='combo', title='The Living Labyrinth', rows=[
        '#####################',
        '#S  >  T  B  1  X  E#',
        '#####################',
    ], legend={
        '>': {'type': 'oneway', 'dir': 'E'},
        'T': {'type': 'trigger', 'groupId': 'blue'},
        'B': {'type': 'toggle', 'groupId': 'blue', 'initialOpen': False},
        '1': {'type': 'limited', 'uses': 1},
        'X': {'type': 'closing'},
    }),

    # ---- Chapter: Capstone (demo) -----------------------------------------
    # Proof that real difficulty doesn't need keys/objectives. Uses only
    # one-way, closing, linked, and toggle - deliberately no limited-use,
    # since that mechanic can't carry difficulty alone (see
    # level-creation-rulebook.md §7). The player must:
    #   1. detour to the trigger BEFORE crossing the one-way door, since
    #      that door (and the closing door later) make the detour
    #      permanently unreachable afterward,
    #   2. pick the correct linked branch at the fork (the other is a dead
    #      end that also seals the real branch shut),
    #   3. survive the closing door's commitment,
    #   4. arrive at the toggle door already open, as a payoff for step 1 -
    #      or find it permanently sealed with no way back, if they didn't
    #      plan ahead from the very first junction.
    dict(id='capstone-1', chapter='capstone', title='The Vault', rows=_CAPSTONE_ROWS, legend={
        '>': {'type': 'oneway', 'dir': 'E'},
        'T': {'type': 'trigger', 'groupId': 'vault'},
        'A': {'type': 'linked', 'linkId': 'ab'},
        'B': {'type': 'linked', 'linkId': 'ab'},
        'X': {'type': 'closing'},
        'V': {'type': 'toggle', 'groupId': 'vault', 'initialOpen': False},
    }),

    # capstone-2: "mix and match" rather than a chain. A hub with three
    # independent spokes (plain trigger detour, one-way trigger loop, and a
    # linked fork) that can be tackled in any order, freely revisiting the
    # hub between them - only the single one-way door well past the fork is
    # actually irreversible. Nothing here is sequenced; it's a set of
    # prerequisites the player has to satisfy before committing, in
    # whichever order they choose.
    dict(id='capstone-2', chapter='capstone', title='Any Order', rows=_CAPSTONE2_ROWS, legend={
        '<': {'type': 'oneway', 'dir': 'W'},
        '>': {'type': 'oneway', 'dir': 'E'},
        'T': {'type': 'trigger', 'groupId': 'blue'},
        'B': {'type': 'toggle', 'groupId': 'blue', 'initialOpen': False},
        't': {'type': 'trigger', 'groupId': 'orange'},
        'b': {'type': 'toggle', 'groupId': 'orange', 'initialOpen': False},
        'P': {'type': 'linked', 'linkId': 'pair1'},
        'Q': {'type': 'linked', 'linkId': 'pair1'},
        'X': {'type': 'closing'},
    }),

    dict(id='capstone-3', chapter='capstone', title='No Second Chances', rows=_NO_SECOND_CHANCES_ROWS, legend={
        '>': {'type': 'oneway', 'dir': 'E'},
        '^': {'type': 'oneway', 'dir': 'N'},
        'T': {'type': 'trigger', 'groupId': 'blue'},
        'B': {'type': 'toggle', 'groupId': 'blue', 'initialOpen': False},
        't': {'type': 'trigger', 'groupId': 'orange'},
        'b': {'type': 'toggle', 'groupId': 'orange', 'initialOpen': False},
        'P': {'type': 'linked', 'linkId': 'pair1'},
        'Q': {'type': 'linked', 'linkId': 'pair1'},
        'R': {'type': 'linked', 'linkId': 'pair2'},
        'U': {'type': 'linked', 'linkId': 'pair2'},
        'X': {'type': 'closing'},
    }),
]

EXPECTED_DECORATIVE = {
    # Trap/decoy branches are *meant* to be solvable-if-blocked — blocking
    # them just means "never go there", which is exactly the intended
    # lesson (the real branch/door alone must remain essential).
    'oneway-2': {'door-4-5'},
    'limited-2': {'door-2-1'},
    'linked-1': {'door-2-1'},
    'linked-2': {'door-10-3'},
    'combo-1': {'door-4-3'},
    'capstone-1': {'door-5-5'},
    'capstone-2': {'door-14-3'},
    'capstone-3': {'door-8-5', 'door-15-8', 'door-18-12'},
}


# ---------------------------------------------------------------------------
# Build a plain model (no DOM) from a spec — the single interpretation of
# the char grid, shared by the solver and the SVG emitter below.
# ---------------------------------------------------------------------------
def build_plan(spec):
    rows = spec['rows']
    height = len(rows)
    width = max(len(r) for r in rows)
    cells = {}
    door_defs = []
    link_pairs = {}
    start = exit_ = None

    for y, row in enumerate(rows):
        for x in range(width):
            ch = row[x] if x < len(row) else '#'
            if ch == '#':
                cells[(x, y)] = {'kind': 'wall'}
            elif ch in (' ', '.'):
                cells[(x, y)] = {'kind': 'floor'}
            elif ch == 'S':
                cells[(x, y)] = {'kind': 'start'}
                start = (x, y)
            elif ch == 'E':
                cells[(x, y)] = {'kind': 'exit'}
                exit_ = (x, y)
            else:
                meta = spec['legend'].get(ch)
                if meta is None:
                    raise ValueError(f"{spec['id']}: unrecognized char '{ch}' at ({x},{y})")
                if meta['type'] == 'trigger':
                    cells[(x, y)] = {'kind': 'floor', 'triggerGroup': meta['groupId']}
                else:
                    did = f'door-{x}-{y}'
                    d = {'id': did, 'x': x, 'y': y, **meta}
                    door_defs.append(d)
                    cells[(x, y)] = {'kind': 'door', 'doorId': did, 'def': d}
                    if d.get('linkId'):
                        link_pairs.setdefault(d['linkId'], []).append(did)

    if start is None:
        raise ValueError(f"{spec['id']}: missing S")
    if exit_ is None:
        raise ValueError(f"{spec['id']}: missing E")
    for lid, pair in link_pairs.items():
        if len(pair) != 2:
            raise ValueError(f"{spec['id']}: linkId '{lid}' has {len(pair)} doors, need 2")

    def cell_at(x, y):
        if x < 0 or y < 0 or x >= width or y >= height:
            return {'kind': 'wall'}
        return cells.get((x, y), {'kind': 'wall'})

    return {
        'cols': width, 'rows': height, 'start': start, 'exit': exit_,
        'doorDefs': door_defs, 'linkPairs': link_pairs, 'cellAt': cell_at,
    }


def initial_door_state(d):
    if d['type'] == 'limited':
        return {'usesRemaining': d['uses']}
    if d['type'] in ('closing', 'linked'):
        return {'open': True}
    if d['type'] == 'toggle':
        return {'open': d.get('initialOpen', True) is not False}
    return {}


def can_enter(d, state, travel_dir):
    t = d['type']
    if t == 'oneway':
        return travel_dir == d['dir']
    if t in ('closing', 'linked'):
        return state['open']
    if t == 'limited':
        return state['usesRemaining'] > 0
    if t == 'toggle':
        return state['open']
    return True


def on_enter(d, door_states, link_pairs):
    t = d['type']
    if t == 'closing':
        door_states[d['id']]['open'] = False
    elif t == 'limited':
        door_states[d['id']]['usesRemaining'] -= 1
    elif t == 'linked':
        pair = link_pairs.get(d['linkId'], [])
        partner = next((i for i in pair if i != d['id']), None)
        if partner:
            door_states[partner]['open'] = False


def apply_trigger(group_id, door_defs, door_states):
    for d in door_defs:
        if d['type'] == 'toggle' and d.get('groupId') == group_id:
            door_states[d['id']]['open'] = not door_states[d['id']]['open']


# ---------------------------------------------------------------------------
# Solver — BFS over (position, door-state) using the rules above.
# ---------------------------------------------------------------------------
def is_solvable(model, always_block_door_id=None):
    initial_states = {d['id']: initial_door_state(d) for d in model['doorDefs']}

    def skey(pos, states):
        return f"{pos}|{json.dumps(states, sort_keys=True)}"

    visited = {skey(model['start'], initial_states)}
    queue = deque([(model['start'], initial_states)])

    while queue:
        pos, states = queue.popleft()
        if pos == model['exit']:
            return True
        for dk, (dx, dy) in DIRS.items():
            nxt = (pos[0] + dx, pos[1] + dy)
            cell = model['cellAt'](*nxt)
            if cell['kind'] == 'wall':
                continue
            if cell['kind'] == 'door':
                if cell['doorId'] == always_block_door_id:
                    continue
                if not can_enter(cell['def'], states[cell['doorId']], dk):
                    continue
            next_states = json.loads(json.dumps(states))
            if cell['kind'] == 'door':
                on_enter(cell['def'], next_states, model['linkPairs'])
            elif cell['kind'] == 'floor' and cell.get('triggerGroup'):
                apply_trigger(cell['triggerGroup'], model['doorDefs'], next_states)
            k = skey(nxt, next_states)
            if k not in visited:
                visited.add(k)
                queue.append((nxt, next_states))
    return False


def find_decorative(model):
    return [d['id'] for d in model['doorDefs'] if is_solvable(model, always_block_door_id=d['id'])]


# ---------------------------------------------------------------------------
# SVG emitter — mirrors generate-levels.mjs's renderSVG/doorSymbolMarkup.
# ---------------------------------------------------------------------------
def esc(s):
    return str(s).replace('&', '&amp;').replace('"', '&quot;')


def door_symbol_markup(d):
    cx = cy = 20
    t = d['type']
    if t == 'oneway':
        rot = {'E': 0, 'S': 90, 'W': 180, 'N': 270}[d['dir']]
        return (f'<g class="door-symbol door-arrow" transform="rotate({rot} {cx} {cy})">'
                f'<path d="M9,10 L31,20 L9,30 Z" /></g>')
    if t == 'closing':
        return (f'<circle class="door-symbol door-ring" cx="{cx}" cy="{cy}" r="12" />'
                f'<rect class="door-shutter" x="4" y="4" width="32" height="32" />')
    if t == 'limited':
        return (f'<circle class="door-symbol door-ring" cx="{cx}" cy="{cy}" r="13" />'
                f'<text class="uses-label" x="{cx}" y="{cy + 5}" text-anchor="middle">{d["uses"]}</text>')
    if t == 'linked':
        return (f'<g class="door-symbol door-chain link-{esc(d["linkId"])}">'
                f'<circle cx="14" cy="20" r="8" /><circle cx="26" cy="20" r="8" /></g>'
                f'<rect class="door-shutter" x="4" y="4" width="32" height="32" />')
    if t == 'toggle':
        return ('<g class="door-symbol toggle-open-art"><circle cx="20" cy="20" r="13" /></g>'
                '<g class="door-symbol toggle-closed-art">'
                '<circle cx="20" cy="20" r="13" /><path d="M10,10 L30,30 M30,10 L10,30" /></g>')
    return ''


def trigger_symbol_markup(group_id):
    return f'<path class="trigger-symbol group-{esc(group_id)}" d="M20,10 L30,20 L20,30 L10,20 Z" />'


def render_svg(spec, model):
    w = model['cols'] * TILE
    h = model['rows'] * TILE
    body = []

    for y in range(model['rows']):
        for x in range(model['cols']):
            cell = model['cellAt'](x, y)
            px, py = x * TILE, y * TILE

            if cell['kind'] == 'door':
                d = cell['def']
                css_class = f'door door-{esc(d["type"])}'
                if d.get('groupId'):
                    css_class += f' group-{esc(d["groupId"])}'
                attrs = [
                    f'class="{css_class}"',
                    f'data-x="{x}"', f'data-y="{y}"', f'data-type="{esc(d["type"])}"',
                ]
                if d.get('dir'):
                    attrs.append(f'data-dir="{esc(d["dir"])}"')
                if d.get('uses') is not None:
                    attrs.append(f'data-uses="{d["uses"]}"')
                if d.get('linkId'):
                    attrs.append(f'data-link-id="{esc(d["linkId"])}"')
                if d.get('groupId'):
                    attrs.append(f'data-group-id="{esc(d["groupId"])}"')
                if d['type'] == 'toggle':
                    attrs.append(f'data-initial-open="{str(d.get("initialOpen", True) is not False).lower()}"')
                body.append(
                    f'<g {" ".join(attrs)} transform="translate({px} {py})">'
                    f'<rect class="tile-base" x="0" y="0" width="{TILE}" height="{TILE}" />'
                    f'{door_symbol_markup(d)}</g>'
                )
                continue

            kind_attrs = f'class="tile tile-{esc(cell["kind"])}" data-x="{x}" data-y="{y}" data-kind="{esc(cell["kind"])}"'
            if cell.get('triggerGroup'):
                kind_attrs += f' data-trigger-group="{esc(cell["triggerGroup"])}"'
            body.append(f'<rect {kind_attrs} x="{px}" y="{py}" width="{TILE}" height="{TILE}" />')

            if cell['kind'] == 'start':
                body.append(f'<circle class="start-marker" cx="{px + 20}" cy="{py + 20}" r="6" />')
            elif cell['kind'] == 'exit':
                body.append(f'<rect class="exit-marker" x="{px + 12}" y="{py + 12}" width="16" height="16" />')
            elif cell.get('triggerGroup'):
                body.append(f'<g transform="translate({px} {py})">{trigger_symbol_markup(cell["triggerGroup"])}</g>')

    body_str = '\n'.join(body)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'data-cols="{model["cols"]}" data-rows="{model["rows"]}" '
            f'data-level-id="{esc(spec["id"])}" data-level-title="{esc(spec["title"])}">\n{body_str}\n</svg>\n')


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
def main():
    os.makedirs(LEVELS_DIR, exist_ok=True)
    manifest_entries = []
    failed = 0

    for spec in LEVELS:
        try:
            model = build_plan(spec)
        except ValueError as e:
            print(f'[FAIL] {spec["id"]}: {e}')
            failed += 1
            continue

        if not is_solvable(model):
            print(f'[FAIL] {spec["id"]}: no solution found from S to E')
            failed += 1
            continue

        decorative = set(find_decorative(model))
        unexpected = decorative - EXPECTED_DECORATIVE.get(spec['id'], set())
        if unexpected:
            print(f'[FAIL] {spec["id"]}: unexpected decorative door(s) {sorted(unexpected)} — level solvable even with them always blocked')
            failed += 1
            continue

        svg = render_svg(spec, model)
        filename = f'{spec["id"]}.svg'
        with open(os.path.join(LEVELS_DIR, filename), 'w', encoding='utf-8', newline='\n') as f:
            f.write(svg)
        manifest_entries.append({'id': spec['id'], 'chapter': spec['chapter'], 'title': spec['title'], 'file': f'./{filename}'})
        print(f'[OK]   {spec["id"]} ({model["cols"]}x{model["rows"]}, {len(model["doorDefs"])} doors)')

    if failed:
        print(f'\n{failed} level(s) failed validation — not writing manifest.')
        raise SystemExit(1)

    manifest_src = (
        '// Generated by scripts/generate_levels.py (or generate-levels.mjs) — do not hand-edit.\n'
        f'export const LEVELS = {json.dumps(manifest_entries, indent=2)};\n'
    )
    with open(os.path.join(LEVELS_DIR, 'manifest.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(manifest_src)
    print(f'\nWrote {len(manifest_entries)} levels + manifest.js')


if __name__ == '__main__':
    main()
