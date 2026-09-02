#!/usr/bin/env bash
#
# run.sh — single entry point for the k6 framework.
#
#   ./run.sh                             # all tests, dev env, load scenario
#   ./run.sh -e staging -s stress        # all tests against staging, stress profile
#   ./run.sh -t login                    # only tests/login.test.js
#   ./run.sh -t posts -s smoke           # quick sanity check
#
# Exit codes:  0 = pass,  99 = a k6 threshold was breached,  other = k6 error.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_NAME="dev"
SCENARIO="load"
TEST_FILTER="all"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="$ROOT_DIR/reports/$TIMESTAMP"

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[0;33m"; BLUE="\033[0;34m"; NC="\033[0m"

usage() {
  cat <<EOF
Usage: ./run.sh [-e dev|staging] [-s load|stress|smoke] [-t all|login|posts|search]

  -e   environment config to load   (default: dev)
  -s   execution scenario           (default: load)
  -t   test to run                  (default: all)
  -h   show this help
EOF
}

while getopts ":e:s:t:h" opt; do
  case "$opt" in
    e) ENV_NAME="$OPTARG" ;;
    s) SCENARIO="$OPTARG" ;;
    t) TEST_FILTER="$OPTARG" ;;
    h) usage; exit 0 ;;
    \?) echo "Unknown option -$OPTARG"; usage; exit 1 ;;
    :) echo "Option -$OPTARG needs a value"; usage; exit 1 ;;
  esac
done

# --- preflight -------------------------------------------------------------
if ! command -v k6 >/dev/null 2>&1; then
  echo -e "${RED}k6 is not installed or not on PATH.${NC}"
  echo "Install: https://grafana.com/docs/k6/latest/set-up/install-k6/"
  exit 1
fi

case "$TEST_FILTER" in
  all)    TESTS=(tests/login.test.js tests/posts.test.js tests/search.test.js) ;;
  login)  TESTS=(tests/login.test.js) ;;
  posts)  TESTS=(tests/posts.test.js) ;;
  search) TESTS=(tests/search.test.js) ;;
  *)      echo -e "${RED}Unknown test '$TEST_FILTER'${NC}"; usage; exit 1 ;;
esac

mkdir -p "$REPORT_DIR"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE} k6 framework${NC}"
echo -e "  environment : ${YELLOW}${ENV_NAME}${NC}"
echo -e "  scenario    : ${YELLOW}${SCENARIO}${NC}"
echo -e "  tests       : ${YELLOW}${TESTS[*]}${NC}"
echo -e "  reports     : ${YELLOW}${REPORT_DIR}${NC}"
echo -e "${BLUE}=====================================================${NC}"

OVERALL_EXIT=0
declare -a RESULTS=()

for test_file in "${TESTS[@]}"; do
  name="$(basename "$test_file" .test.js)"
  echo -e "\n${BLUE}--> running ${name} (${SCENARIO} / ${ENV_NAME})${NC}\n"

  # REPORT_DIR is read by helpers/report.helper.js -> handleSummary()
  # Path is relative to the CWD of `k6 run`, which is always $ROOT_DIR here.
  k6 run \
    -e "ENV=${ENV_NAME}" \
    -e "SCENARIO=${SCENARIO}" \
    -e "REPORT_DIR=reports/${TIMESTAMP}" \
    "$test_file"

  code=$?

  if [ $code -eq 0 ]; then
    echo -e "${GREEN}PASS  ${name}${NC}"
    RESULTS+=("PASS  ${name}")
  elif [ $code -eq 99 ]; then
    echo -e "${RED}FAIL  ${name} — threshold breached${NC}"
    RESULTS+=("FAIL  ${name} (threshold breached)")
    OVERALL_EXIT=99
  else
    echo -e "${RED}ERROR ${name} — k6 exited with ${code}${NC}"
    RESULTS+=("ERROR ${name} (exit ${code})")
    [ $OVERALL_EXIT -eq 0 ] && OVERALL_EXIT=$code
  fi
done

echo -e "\n${BLUE}===================== summary =====================${NC}"
for line in "${RESULTS[@]}"; do
  case "$line" in
    PASS*) echo -e "${GREEN}${line}${NC}" ;;
    *)     echo -e "${RED}${line}${NC}" ;;
  esac
done
echo -e "${BLUE}===================================================${NC}"
echo ""
echo "HTML reports:"
for f in "$REPORT_DIR"/*.html; do
  [ -e "$f" ] && echo "  $f"
done
echo ""
echo "Open the newest one with:"
case "$(uname -s)" in
  Darwin) echo "  open $REPORT_DIR/*.html" ;;
  Linux)  echo "  xdg-open $REPORT_DIR/*.html" ;;
  *)      echo "  start $REPORT_DIR/*.html" ;;
esac

exit $OVERALL_EXIT
