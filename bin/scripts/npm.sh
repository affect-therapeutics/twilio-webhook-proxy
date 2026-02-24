#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
TOP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

print_help() {
  cat <<EOS

NPM Script Runner
=================
Runs npm scripts defined in package.json.

Usage:   npm [script-name] [args...]

Available Scripts
-----------------
EOS

  # Read and display available scripts from package.json
  if command -v node &> /dev/null; then
    node -e "
      const pkg = require('${TOP_DIR}/package.json');
      if (pkg.scripts) {
        Object.keys(pkg.scripts).forEach(script => {
          console.log('  ' + script.padEnd(20) + pkg.scripts[script]);
        });
      }
    " 2>/dev/null || echo "  (Unable to read package.json)"
  else
    echo "  (node not available)"
  fi

  cat <<EOS

Examples
--------
  service test                    # Run tests
  service start                   # Start development server
  service deploy                  # Deploy to staging
  service deploy-prod             # Deploy to production
s
EOS
}

run_npm_script() {
  local script_name=$1
  shift
  local args="$@"

  cd "${TOP_DIR}"

  # Check if the script exists in package.json
  if command -v node &> /dev/null; then
    local script_exists=$(node -e "
      const pkg = require('./package.json');
      console.log(pkg.scripts && pkg.scripts['${script_name}'] ? 'true' : 'false');
    " 2>/dev/null)

    if [ "$script_exists" = "false" ]; then
      echo "Error: npm script '${script_name}' not found in package.json"
      echo ""
      print_help
      exit 1
    fi
  fi

  # Run the npm script with any additional arguments
  npm run "$script_name" -- $args
}

case $1 in
  "")
    print_help
    ;;
  *)
    run_npm_script "$@"
    ;;
esac
