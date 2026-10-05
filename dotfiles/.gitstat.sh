gs() {
  local branch ahead behind

  if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo "Not a git repository"
    return 1
  fi

  branch=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD)

  local upstream
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)
  if [[ -n "$upstream" ]]; then
    ahead=$(git rev-list --count '@{u}..HEAD' 2>/dev/null)
    behind=$(git rev-list --count 'HEAD..@{u}' 2>/dev/null)
  fi

  local RED=$'\e[31m' GREEN=$'\e[32m' YELLOW=$'\e[33m' BLUE=$'\e[34m' MAGENTA=$'\e[35m' CYAN=$'\e[36m' GREY=$'\e[90m' BOLD=$'\e[1m' DIM=$'\e[2m' RESET=$'\e[0m'

  printf "%s %s%s%s" "${BOLD}${MAGENTA}▣${RESET}" "${BOLD}" "$branch" "${RESET}"

  if [[ -n "$upstream" ]]; then
    [[ "$ahead" -gt 0 ]] && printf " ${GREEN}ahead %s${RESET}" "$ahead"
    [[ "$behind" -gt 0 ]] && printf " ${RED}behind %s${RESET}" "$behind"
  else
    printf " ${DIM}(no upstream)${RESET}"
  fi
  printf "\n"

  local has_output=0
  local conflicts=()

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local x="${line:0:1}" y="${line:1:1}" file="${line:3}"
    if [[ "$x" == "U" || "$y" == "U" || ( "$x" == "A" && "$y" == "A" ) || ( "$x" == "D" && "$y" == "D" ) ]]; then
      conflicts+=("$file")
    fi
  done < <(git status --porcelain -- . 2>/dev/null)

  if [[ "${#conflicts[@]}" -gt 0 ]]; then
    printf "  ${RED}⚠ conflicts${RESET}\n"
    for f in "${conflicts[@]}"; do printf "      ${RED}⚠ %s${RESET}\n" "$f"; done
    has_output=1
  fi

  local staged_files
  staged_files=$(git diff --cached --name-status --relative -- . 2>/dev/null)
  if [[ -n "$staged_files" ]]; then
    printf "  ${GREEN}● staged${RESET}\n"
    while IFS=$'\t' read -r st file rest; do
      [[ -z "$file" ]] && continue
      case "$st" in
        A*) printf "      ${GREEN}✚ %s${RESET}\n" "$file" ;;
        M*) printf "      ${GREEN}✎ %s${RESET}\n" "$file" ;;
        D*) printf "      ${GREEN}✖ %s${RESET}\n" "$file" ;;
        R*) printf "      ${GREEN}↔ %s → %s${RESET}\n" "$file" "$rest" ;;
        C*) printf "      ${GREEN}⎘ %s${RESET}\n" "$file" ;;
        *)  printf "      ${GREEN}• %s${RESET}\n" "$file" ;;
      esac
    done <<< "$staged_files"
    has_output=1
  fi

  local unstaged_files
  unstaged_files=$(git diff --name-status --relative -- . 2>/dev/null)
  if [[ -n "$unstaged_files" ]]; then
    printf "  ${YELLOW}● modified${RESET}\n"
    while IFS=$'\t' read -r st file rest; do
      [[ -z "$file" ]] && continue
      case "$st" in
        M*) printf "      ${YELLOW}✎ %s${RESET}\n" "$file" ;;
        D*) printf "      ${YELLOW}✖ %s${RESET}\n" "$file" ;;
        R*) printf "      ${YELLOW}↔ %s → %s${RESET}\n" "$file" "$rest" ;;
        *)  printf "      ${YELLOW}• %s${RESET}\n" "$file" ;;
      esac
    done <<< "$unstaged_files"
    has_output=1
  fi

  local untracked_files
  untracked_files=$(git ls-files --others --exclude-standard -- . 2>/dev/null)
  if [[ -n "$untracked_files" ]]; then
    printf "  ${CYAN}● untracked${RESET}\n"
    while IFS= read -r file; do
      [[ -z "$file" ]] && continue
      printf "      ${CYAN}? %s${RESET}\n" "$file"
    done <<< "$untracked_files"
    has_output=1
  fi

  [[ "$has_output" -eq 0 ]] && printf "  ${GREEN}✓ clean${RESET}\n"
}
