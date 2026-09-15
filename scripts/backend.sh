#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$project_root/.env" ]; then
  echo '먼저 node scripts/setup.mjs를 실행하세요.' >&2
  exit 1
fi
set -a
source "$project_root/.env"
set +a
if [ "$(uname -s)" = Darwin ]; then
  bankcore_java_home="$(/usr/libexec/java_home -v 21)"
else
  bankcore_java_home="${JAVA_HOME:?Set JAVA_HOME to JDK 21}"
fi
cd "$project_root/backend"
if [ "$#" -eq 0 ]; then
  set -- bootRun
fi
exec env JAVA_HOME="$bankcore_java_home" ./gradlew "$@"
