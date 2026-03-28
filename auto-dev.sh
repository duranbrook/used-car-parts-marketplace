#!/bin/bash
#
# Autonomous Development Loop for Used Car Parts Marketplace
#
# The loop has two modes that alternate:
#   BUILD MODE:  Pick top backlog item → Plan → Implement → Review → Repeat
#   RESEARCH MODE: When backlog is empty, search the web for missing features,
#                  reprioritize, and switch back to build mode
#
# Usage:
#   ./auto-dev.sh                # run forever (research + build cycle)
#   ./auto-dev.sh --max 5        # stop after 5 build iterations
#   ./auto-dev.sh --build-only   # skip research, just build from backlog
#   ./auto-dev.sh --research-only # just do one research cycle and stop
#
# To stop: Ctrl+C (finishes current phase cleanly)

set -euo pipefail

BACKLOG="BACKLOG.md"
LOG_DIR=".auto-dev-logs"
MAX_ITERATIONS=0
BUILD_ONLY=false
RESEARCH_ONLY=false
RESEARCH_CYCLES=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --max) MAX_ITERATIONS="$2"; shift 2 ;;
    --build-only) BUILD_ONLY=true; shift ;;
    --research-only) RESEARCH_ONLY=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"
iteration=0

banner() {
  echo ""
  echo "========================================="
  echo " $1"
  echo " $(date '+%Y-%m-%d %H:%M:%S')"
  echo "========================================="
}

# ═══════════════════════════════════════════════
#  RESEARCH PHASE
#  Searches the web for missing features, adds
#  them to BACKLOG.md, and prioritizes
# ═══════════════════════════════════════════════
run_research() {
  RESEARCH_CYCLES=$((RESEARCH_CYCLES + 1))
  local log_file="$LOG_DIR/research-${RESEARCH_CYCLES}-$(date +%Y%m%d-%H%M%S).md"

  banner "RESEARCH CYCLE $RESEARCH_CYCLES — Discovering Missing Features"

  claude --dangerously-skip-permissions --print \
    "You are an autonomous product researcher for a used car parts marketplace app.

     STEP 1: Read BACKLOG.md to understand what features have been built (checked [x])
     and what is planned (unchecked [ ]).

     STEP 2: Read through the actual codebase (look at src/, app/, components/, etc.)
     to understand what has ACTUALLY been implemented so far.

     STEP 3: Do deep web research to find features we're missing. Search for:
     - What features do car-part.com, eBay Motors parts, PartCycle, LKQ Online,
       Row52, RockAuto, and other used parts platforms offer?
     - What are buyers and sellers complaining about on Reddit, forums, and reviews?
     - What new AI/tech capabilities could improve the platform?
     - What are competitors doing that we haven't planned yet?
     - Industry trends in auto recycling and parts marketplace

     STEP 4: Compare what you found against our backlog. Identify features that are:
     - Missing entirely from our backlog
     - Inadequately specified (need more detail)
     - Newly possible due to recent tech developments

     STEP 5: Update BACKLOG.md:
     - Add new features you discovered as unchecked items
     - Place them in the right priority position (not just at the bottom)
     - Prefix new items with 'DISCOVERED:' so we can track what came from research
     - Re-prioritize existing unchecked items if your research suggests a different order
     - DO NOT modify any checked [x] items
     - Add a comment at the top noting this research cycle and date

     STEP 6: Git commit the updated BACKLOG.md with message describing what you found.

     Be thorough. We want to build the best used car parts marketplace." \
    2>&1 | tee -a "$log_file"

  echo "Research log: $log_file"
}

# ═══════════════════════════════════════════════
#  BUILD PHASE (one iteration)
#  Plan → Implement → Review for one backlog item
# ═══════════════════════════════════════════════
run_build() {
  iteration=$((iteration + 1))
  local log_file="$LOG_DIR/build-${iteration}-$(date +%Y%m%d-%H%M%S).md"
  local next_task
  next_task=$(grep -m1 '^\- \[ \]' "$BACKLOG" || true)

  banner "BUILD ITERATION $iteration"
  echo "Task: $next_task"

  # ── Plan ──
  echo "--- Phase 1/3: Planning ---"
  claude --dangerously-skip-permissions --print \
    "You are an autonomous dev agent building a used car parts marketplace.

     Read $BACKLOG and pick the TOP unchecked '- [ ]' item.
     Read the existing codebase to understand what's already built.

     Write a detailed implementation plan to CURRENT_TASK.md:
     - What the feature is and why it matters
     - Files to create or modify (be specific with paths)
     - Database changes needed (Prisma schema updates)
     - API endpoints to create
     - UI components to build
     - Test strategy (what to test and how)
     - Acceptance criteria (how do we know it's done)
     - Dependencies on other features (note if something is missing)

     If this task depends on something not yet built, note it but plan around it
     with reasonable stubs/mocks.

     Do NOT implement yet. Only plan." \
    2>&1 | tee -a "$log_file"

  # ── Implement ──
  echo "--- Phase 2/3: Implementing ---"
  claude --dangerously-skip-permissions --print \
    "You are an autonomous dev agent building a used car parts marketplace.

     Read CURRENT_TASK.md for your assignment. Read existing code to avoid conflicts.

     Implement the feature completely:
     1. Update Prisma schema if needed (run npx prisma generate after)
     2. Create/update API routes
     3. Create/update UI components and pages
     4. Write tests (unit tests with Jest/Vitest, integration tests where appropriate)
     5. Run the tests: npm test or npx vitest run
     6. If tests fail, fix until they pass
     7. Make sure the app builds: npm run build (fix any TypeScript/build errors)
     8. Git add relevant files and commit with a descriptive message

     Write clean, production-quality code. Use TypeScript throughout.
     Follow Next.js App Router conventions.
     Use Tailwind CSS for styling.

     Do NOT update the backlog." \
    2>&1 | tee -a "$log_file"

  # ── Review & Bookkeeping ──
  echo "--- Phase 3/3: Review & Bookkeeping ---"
  claude --dangerously-skip-permissions --print \
    "You are an autonomous code reviewer for a used car parts marketplace.

     1. Read the git log to see what was just committed
     2. Review the changes: check for bugs, security issues, missing error handling,
        broken imports, TypeScript errors
     3. Run the full test suite (npm test or npx vitest run)
     4. Run the build (npm run build) to catch any issues
     5. If you find problems, fix them and commit the fixes
     6. In $BACKLOG, check off the completed item: change '- [ ]' to '- [x]'
        and append a short note like '(done: added auth with NextAuth + Google OAuth)'
     7. Commit the backlog update

     If you discover bugs or follow-up work needed, add new items to the backlog:
     - 'BUG: ...' items go at the very top (highest priority)
     - 'FOLLOW-UP: ...' items go right after the current phase section" \
    2>&1 | tee -a "$log_file"

  echo "Build log: $log_file"
}

# ═══════════════════════════════════════════════
#  MAIN LOOP
# ═══════════════════════════════════════════════

# Research-only mode
if $RESEARCH_ONLY; then
  run_research
  echo "=== Research complete. Review BACKLOG.md for updates. ==="
  exit 0
fi

# Initial research if not build-only and this is a fresh start
if ! $BUILD_ONLY && [[ $iteration -eq 0 ]]; then
  has_completed=$(grep -c '^\- \[x\]' "$BACKLOG" 2>/dev/null || echo "0")
  if [[ "$has_completed" -eq 0 ]]; then
    echo "(Skipping initial research — backlog already has items to build)"
  fi
fi

while true; do
  # Check if there are unchecked items
  if ! grep -q '^\- \[ \]' "$BACKLOG"; then
    if $BUILD_ONLY; then
      banner "BACKLOG EMPTY — All tasks complete!"
      exit 0
    fi

    # No more items — enter research mode to find new features
    banner "BACKLOG EMPTY — Entering Research Mode"
    run_research

    # Check if research added new items
    if ! grep -q '^\- \[ \]' "$BACKLOG"; then
      echo "=== Research found no new features. We're done! ==="
      exit 0
    fi

    echo "=== New features discovered! Resuming build mode. ==="
    continue
  fi

  # Build the next item
  run_build

  # Check iteration limit
  if [[ $MAX_ITERATIONS -gt 0 && $iteration -ge $MAX_ITERATIONS ]]; then
    banner "Reached max iterations ($MAX_ITERATIONS). Stopping."
    remaining=$(grep -c '^\- \[ \]' "$BACKLOG" 2>/dev/null || echo "0")
    echo "$remaining items remaining in backlog."
    exit 0
  fi

  # Brief pause for clean Ctrl+C
  sleep 2
done
