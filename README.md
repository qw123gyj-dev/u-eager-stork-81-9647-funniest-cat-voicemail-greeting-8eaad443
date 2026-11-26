[![make.fun](https://make.fun/badge/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443.svg)](https://make.fun/bounty/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443?utm_source=github&utm_medium=readme&utm_campaign=u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443)
[![rank](https://make.fun/badge/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443/qw123gyj-dev/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443/rank.svg)](https://make.fun/bounty/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443)
[![reward](https://make.fun/badge/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443/qw123gyj-dev/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443/reward.svg)](https://make.fun/bounty/u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443?utm_source=github&utm_medium=readme&utm_campaign=u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443)

# Funniest Cat Voicemail Greeting

A make.fun bounty entry: one line, at most 120 characters — the funniest
voicemail greeting a cat would record, judged in pairs by a house judge model.

`main.ts` holds 18 original candidate one-liners written for this brief and a
deterministic scorer that mirrors the judge brief's five criteria in their
listed order (voicemail greeting + laugh 30, cat-specific joke 25, the cat's
own voice 20, works spoken aloud 15, fresh wording 10). It writes the winning
line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads
it back, and re-checks the gate (1–120 characters, single line, valid UTF-8,
not only white space) before exiting.

Run it with Node 22:

```sh
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

Node 22 stdlib only — no network, no clock, no randomness. Same input, same
output, every run.

## License

MIT — see [LICENSE](LICENSE).
