#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_NAME="qa"
SCENARIO="smoke"
TEST_FILTER="sensor"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

usage() {
  echo "Usage: ./run.sh [-e dev|qa] [-s smoke|load|stress] [-t login|sensor|all]"
}

while getopts ":e:s:t:h" opt; do
  case "$opt" in
    e) ENV_NAME="$OPTARG" ;;
    s) SCENARIO="$OPTARG" ;;
    t) TEST_FILTER="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed or not on PATH."
  exit 1
fi

if [ -z "${RT_EMAIL:-}" ] || [ -z "${RT_PASSWORD:-}" ]; then
  echo "RT_EMAIL and RT_PASSWORD must be set."
  exit 1
fi

case "$TEST_FILTER" in
  login)  TESTS=(tests/login.test.js) ;;
  sensor) TESTS=(tests/sensor-readings.test.js) ;;
  all)    TESTS=(tests/login.test.js tests/sensor-readings.test.js) ;;
  *)      usage; exit 1 ;;
esac

if [ "$TEST_FILTER" != "login" ] && [ -z "${VIN:-}" ] && ! grep -Eq '"vin"[[:space:]]*:[[:space:]]*"[^\"]+"' data/vins.json; then
  echo "Set VIN or add valid VINs to data/vins.json."
  exit 1
fi

OVERALL_EXIT=0
mkdir -p "reports/${TIMESTAMP}"

for test_file in "${TESTS[@]}"; do
  args=(
    -e "ENV=${ENV_NAME}"
    -e "SCENARIO=${SCENARIO}"
    -e "REPORT_DIR=reports/${TIMESTAMP}"
    -e "RT_EMAIL=${RT_EMAIL}"
    -e "RT_PASSWORD=${RT_PASSWORD}"
  )

  if [ -n "${VIN:-}" ]; then
    args+=(-e "VIN=${VIN}")
  fi

  k6 run "${args[@]}" "$test_file"
  code=$?
  if [ $code -ne 0 ]; then OVERALL_EXIT=$code; fi
done

exit $OVERALL_EXIT
