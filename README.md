# RoadTech k6 Performance Framework

k6 performance tests for the RoadTech sensor-readings API.

## Target API

`GET /api/sensor-readings/device/{vin}/latest`

This endpoint returns the latest sensor readings for a device and is the main API used for load and stress testing.

## Environments

- `qa` -> `https://qa-fe-rtadmin.roadtechconnect.com`
- `dev` -> `https://dev-fe-rtadmin.roadtechconnect.com`

Requests use `x-app-type: rt-app`.

## Tests

- `tests/login.test.js` - validates the login endpoint
- `tests/sensor-readings.test.js` - tests latest sensor readings by VIN

## Scenarios

- Smoke: 1 VU, 3 iterations
- Load: ramp to 20 VUs, hold for 60 seconds, then ramp down
- Stress: ramp to 100 VUs and stop if the failure rate exceeds 5%

## Test data

A VIN can be supplied directly:

```bat
set "VIN=your-valid-qa-vin"
```

For data-driven testing, valid VINs can also be added to `data/vins.json`. VUs will cycle through the available VINs using `SharedArray`.

## Credentials

Credentials are passed at runtime and should not be committed to Git.

Windows CMD:

```bat
set "RT_EMAIL=your-email"
set "RT_PASSWORD=your-password"
set "VIN=your-valid-qa-vin"
```

## Smoke test

Test login first:

```bat
k6 run -e ENV=qa -e SCENARIO=smoke -e RT_EMAIL="%RT_EMAIL%" -e RT_PASSWORD="%RT_PASSWORD%" tests\login.test.js
```

Then test sensor readings:

```bat
k6 run -e ENV=qa -e SCENARIO=smoke -e RT_EMAIL="%RT_EMAIL%" -e RT_PASSWORD="%RT_PASSWORD%" -e VIN="%VIN%" tests\sensor-readings.test.js
```

## Load test

```bat
k6 run -e ENV=qa -e SCENARIO=load -e RT_EMAIL="%RT_EMAIL%" -e RT_PASSWORD="%RT_PASSWORD%" -e VIN="%VIN%" tests\sensor-readings.test.js
```

## Stress test

```bat
k6 run -e ENV=qa -e SCENARIO=stress -e RT_EMAIL="%RT_EMAIL%" -e RT_PASSWORD="%RT_PASSWORD%" -e VIN="%VIN%" tests\sensor-readings.test.js
```

## Reports

Each run generates HTML and JSON reports under `reports/`.
