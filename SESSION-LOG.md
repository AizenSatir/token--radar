# Session log — token-radar-01, Day-1 (v1)

Agent: Freya (Muse), coordinator for Rodriguez (handle rapid-falcon-61).
Competition: token-radar-01, "Build the best token launch radar", make.fun.
Date: 2026-11-17 (WITA). Deadline: 14 Dec 2026 18:00 WITA (10:00 UTC).

## What was done

1. Read the official brief end to end: kit RULES.txt, competition.yaml, and the
   starter (main.ts, lib/model.ts, vendor/makefun-board.ts, dashboard/, screenshots/).
   Verified the competition from the live make.fun API: $1,325 total (1st $1,000,
   2nd–5th $50, 6th–10th $25), deadline 14 Dec 2026 18:00 WITA, 11,128 submissions
   at the time of the check, escrow funded ($1,325, HD6as9UHeN5RwtzgmWmBWbdTaYtTXGNjfXag3Rgby8Rf).
   Snapshot: 758 protocols, watchlist 40, as_of 2026-11-14, source DefiLlama.
2. Wrote the loadout card: `~/workspace/goals/bug-bounty-hunting/files/loadout-makefun-token-radar-01.md`.
3. Studied the starter model radar-1 (flat 0.25 multiple, maturity 0.6–1.0 over 1095d,
   200 rows) and the house anchor 2-plain dashboard. Decided the starter is the floor
   to beat, not a base to ship: it ranks WBTC ($7.9B TVL), Binance staked ETH, Coinbase
   Bridge, Binance Bitcoin, USDT0 and Base Bridge as "pre-token" because it never applies
   the house wrapped/staked/bridged rule to the early rows.
4. Wrote the radar-2 model (`entry/lib/model.ts`, 26,640 bytes):
   - Category multiple = median mcap/TVL of tokenised peers in the SAME category in the
     snapshot (n>=3, else the global median 0.205), clamped [0.05, 1.00].
   - Size dampening (100M/TVL)^0.12 clamped [0.6, 1.4]; growth clamp [-30, 60]% at half
     weight; log-age maturity 0.65 + 0.35*ln(1+age)/ln(1096), unknown age = 365d.
   - House-rule exclusions applied to early rows too (wrapped/staked/staking words,
     Bridge/Canonical Bridge/Cross Chain Bridge/Liquid Staking/Liquid Restaking/Restaked
     BTC/CEX categories, exchange-name prefixes, versioned names).
   - EARLY_ROWS = 200 (40 watchlist + 200 early = 240 target rows).
   - Farm plans: 6 steps, category-aware + chain-aware gas, every step states cost and time.
5. Built the dashboard (`entry/dashboard/`): dark terminal style, gold accent, no
   framework, no network. Sortable/filterable board, watchlist badges, live-token tab,
   method tab, and a side-panel detail view with the row's model math and farm plan.
   Hash state (#detail, #cat, #chain, #q, #wl, #sort) so each view is linkable.
6. First run: board came out at 178 rows, not 240 — of the 210 pre-token protocols
   below the $50M floor, the house rules set aside 72 (wrapped/staked/bridged
   categories, exchange-name prefixes, and 9 versioned pools such as 'Royco V2'
   and 'Aera V2'), leaving 138 early rows — 62 short of the 200 target. Verified
   the board anyway: ranks 1..178, implied value non-increasing, all 40 watchlist
   rows present, no WBTC, no wrapped/staked names, farm steps 3–12 with 20–600
   chars each. Kept 178 rows rather than loosening the rule — the rule is the point.
7. Rendered the dashboard with headless Chrome (1440x900) and viewed all three
   screenshots. Found and fixed two defects from the renders: (a) the chains column
   pushed TVL/7d/Age/Implied off the right edge — now shows the first 3 chains + a
   count; (b) the detail view sat below the 178-row table, invisible in a 900px
   viewport — now a fixed right-side panel, like the starter's.
8. Final run + official gate: `node main.ts` writes out/ (board.json, data.js,
   dashboard/, screenshots/, dossier.json); `makefun check` run against this repo
   (see the check output in the run notes). No submit — submission is the parent
   agent's decision, and the repo does not exist yet.

## Measured v1 results (verified, not claimed)

- Board: 178 rows (40 watchlist + 138 early). Watchlist max rank 47.
- Top 5 implied values: Steakhouse Financial $377.5M, Gauntlet $240.4M, Veda $224.0M,
  USDD $128.5M, Bittensor dTAO $90.5M. Bottom row $0.9M.
- Category multiples observed: Dexs 0.34, RWA 0.27, CDP 0.17, Risk Curators 0.21
  (global fallback), market median 0.205.
- Dashboard source: index.html 4,543 B + app.css 3,814 B + app.js ~10 KB (whole
  dashboard text ~18 KB, inside the 64 KB dossier text budget).
- Screenshots: 1-board 182,519 B; 2-detail 241,555 B; 3-filtered 162,856 B
  (all under the 512 KiB cap, 1440x900).
- Dossier: 43,164 bytes (cap 1.5 MiB).
- Live tokens set aside: 24 (market cap shown in the dashboard's Live tab).

## Decisions left open (Day-2)

- Whether to relax the house rule for early rows only (e.g. admit liquid-staking
  protocols that pass a stricter name test) to grow the board toward 240 rows.
- Whether the Risk-Curators fallback multiple (0.21 for 12 of the top 16) needs a
  second calibration signal (e.g. peer-group TVL-weighted median).
- Repo: Rodriguez must create a new empty public GitHub repo (e.g. `token-radar`)
  under AizenSatir before any push; submit is the parent agent's decision.
- No model calls anywhere in the entry. No spending. No referrals used.
- No API key or secret appears in this log or in the entry.
