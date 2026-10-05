#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_file="${script_dir}/cal_formatted.js"
output_file="${script_dir}/cal.js"
temp_file="$(mktemp "${script_dir}/.cal.XXXXXX")"

trap 'rm -f "$temp_file"' EXIT

{
  printf 'javascript:'
  npx --yes terser@5.51.2 "$source_file" \
    --compress \
    --mangle \
    --format 'comments=false,beautify=false'
} | tr -d '\r\n' > "$temp_file"

chmod 0644 "$temp_file"
mv "$temp_file" "$output_file"
