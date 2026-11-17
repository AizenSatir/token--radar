# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/AizenSatir/token--radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/AizenSatir/token--radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — a dashboard that ranks pre-token protocols by what a launch would be
worth, and shows how to farm each one. Built for the make.fun token-radar-01 bounty.

The program reads a sealed snapshot of every protocol DefiLlama tracks, finds the ones that
still record no token and are not a wrapped or staked product of one that trades, and ranks
them by an implied value computed from the snapshot's own figures: the category's
market-cap-to-TVL multiple (median of its tokenised peers), a log-size curve, 7-day growth
and log-age maturity. No protocol name is ever special-cased. The dashboard is a static
page that renders with no network: a sortable, filterable board, a detail view for every
protocol with its model math and a costed farm plan, and a live-token view kept apart.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22.18 or later, standard library only. The program writes `out/board.json`
(the ranked board), `out/data.js` (the dashboard's data), `out/dashboard/` (the page)
and `out/dossier.json` (the judge's summary).

## Model (radar-2)

```
implied = TVL × category multiple × size factor × growth × maturity
  category multiple = median mcap/TVL of the category's tokenised peers (≥3 peers,
                      else the market median 0.21), clamped to 0.05–1.00
  size factor       = (100M / TVL)^0.12, clamped to 0.6–1.4
  growth            = 1 + clamp(7d change %, −30…+60) / 100 × 0.5
  maturity          = 0.65 + 0.35 × ln(1 + age days) / ln(1 + 1095)
```

An implied value is this entry's claim about what a token would be worth if the
protocol's record stayed as it is. It does not predict whether or when a token is issued.

---

<sub>Entered on [make.fun](https://make.fun/bounty/token-radar-01)</sub>
