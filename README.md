# k6 Performance Testing Framework

A production-style k6 framework against `https://jsonplaceholder.typicode.com` — config-driven, data-driven, and wired into Jenkins.

## Structure

```
k6-framework/
├── config/
│   ├── dev.json                  # BASE_URL + thresholds for dev
│   └── staging.json              # different BASE_URL + stricter thresholds
├── data/
│   └── users.js                  # SharedArray of 5 users, picked per __VU
├── helpers/
│   ├── config.helper.js          # reads the right config via -e ENV=
│   ├── http.helper.js            # reusable GET/POST/PUT/DELETE + auth headers
│   └── report.helper.js          # k6-reporter HTML output + console summary
├── scenarios/
│   ├── load.scenario.js          # 0→20 VUs / 30s, hold 60s, ramp down
│   ├── stress.scenario.js        # ramp to 100 VUs, abort when errors > 5%
│   └── index.js                  # picks a profile via -e SCENARIO=
├── tests/
│   ├── login.test.js
│   ├── posts.test.js
│   └── search.test.js
├── run.sh                        # single entry point
├── Jenkinsfile                   # load stage → stress stage, fails on breach
└── package.json
```

Nothing in `tests/` imports `k6/http` directly — every request goes through `helpers/http.helper.js`, so auth headers, timeouts, tagging and error accounting are defined once.

## Install

```bash
# macOS
brew install k6
# Debian/Ubuntu
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
# Windows
winget install k6 --source winget
```

## Run

```bash
chmod +x run.sh

./run.sh                          # all 3 tests, dev, load profile
./run.sh -s stress                # stress profile
./run.sh -e staging -s load       # staging BASE_URL
./run.sh -t login -s smoke        # 1 VU / 3 iterations sanity check

# or call k6 directly
k6 run -e ENV=dev -e SCENARIO=load tests/posts.test.js
```

| Flag | Values | Default |
| --- | --- | --- |
| `-e` | `dev`, `staging` | `dev` |
| `-s` | `load`, `stress`, `smoke` | `load` |
| `-t` | `all`, `login`, `posts`, `search` | `all` |

Raw metrics land in `reports/<timestamp>/`.

## How the pieces work

**Env configs** — `config.helper.js` reads both JSON files at init time (k6's `open()` only works in the init context) and exports the one matching `-e ENV=`. `dev` allows p95 < 800ms; `staging` points at a different host and tightens the error budget to 2%.

**Data-driven users** — `SharedArray` parses the user list once, no matter how many VUs run; a plain array would be copied into all 100 VUs during the stress test. `getUserForVU()` uses `(__VU - 1) % users.length`, so VU 1 gets Bret, VU 2 gets Antonette, and so on, wrapping cleanly past 5 VUs.

**Finding the stress breaking point** — the stress profile sets `abortOnFail: true` with `delayAbortEval: '30s'` on the error-rate threshold. k6 stops the run the moment errors cross 5%, and the stage it was in when it aborted is your breaking point. The 30s delay stops one early blip from aborting a run that would otherwise be healthy.

**Exit codes** — k6 returns `99` when a threshold is breached. `run.sh` propagates it and the Jenkinsfile turns it into a failed build.

## HTML reports

Every test writes a standalone HTML dashboard via [k6-reporter](https://github.com/benc-uk/k6-reporter), wired up in `helpers/report.helper.js` and exported from each test as `handleSummary`.

```
reports/20260830-071145/posts-load-dev.html
reports/20260830-071145/posts-load-dev.json
```

Open it in any browser — no server needed.

Two things to know:

**Defining `handleSummary` suppresses k6's default console summary.** That's why `textSummary` is piped back to `stdout`. Drop it and your terminal screenshot comes out empty.

**The reporter URL is pinned to `2.4.0`, not `main`.** The `main` bundle now uses `??` (nullish coalescing), which k6's older Babel-based compiler rejects with a `SyntaxError: Unexpected token`. If you hit that error, this is why — pin the version:

```js
// works on every k6 version
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js';
```

Both imports are remote, so the first run needs internet access. k6 caches them afterwards.

## Jenkins

The pipeline checks out the repo, verifies (or downloads) k6, runs the **load** stage, then the **stress** stage, and archives `reports/**/*.json`. Either stage failing a threshold fails the build. `ENVIRONMENT`, `TEST` and `RUN_STRESS` are build parameters.

Point a Pipeline job at the repo with *Pipeline script from SCM* → `Jenkinsfile`.

## Submission checklist

1. Push to Git: `git init && git add . && git commit -m "k6 framework" && git remote add origin <url> && git push -u origin main`
2. Screenshot the terminal after `./run.sh -s load` — capture the thresholds block with the green checkmarks and the `custom_error_rate` line.
3. Run `./run.sh -s stress` and note the VU count at the moment it aborted.
4. Submit: repo link + screenshot + `Jenkinsfile`.

## Notes

- JSONPlaceholder is a read-mostly mock API: `POST`/`PUT` return a realistic response but nothing is persisted. That's fine for load generation.
- It's a free shared service — be considerate with 100-VU runs, and expect some rate limiting at peak (which is exactly the kind of error the stress threshold is there to catch).
- `staging.json` points at `jsonplaceholder.cypress.io`, a public mirror, purely so the two configs have genuinely different `BASE_URL`s. Swap it for your own host if you'd rather.
