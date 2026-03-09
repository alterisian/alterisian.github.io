#!/usr/bin/env bash
set -euo pipefail

# Usage: ./deploy.sh

SRC_DIR="/home/ian/code/productstudio/projects-portfolio-web/src"
DEST_DIR="/home/ian/code/alterisian.github.io/productstudio"

echo "Deploy: copying from $SRC_DIR -> $DEST_DIR"

if [ ! -d "$SRC_DIR" ]; then
  echo "Source directory does not exist: $SRC_DIR" >&2
  exit 2
fi

mkdir -p "$DEST_DIR"

# Sync files (delete extraneous files at dest)
rsync -av --delete --exclude='.git' "$SRC_DIR/" "$DEST_DIR/"

# If DEST_DIR contains an embedded .git, move it out of the way so the parent repo can track files.
if [ -d "$DEST_DIR/.git" ]; then
  echo "Detected embedded .git in $DEST_DIR; moving embedded .git to backup to avoid nested-repo issues."
  BACKUP="${DEST_DIR}/.git.removed.$(date -u +%Y%m%dT%H%M%SZ)"
  mv "$DEST_DIR/.git" "$BACKUP"
  echo "Moved embedded .git to $BACKUP"
fi

# Find nearest git root (walk up parents) starting at DEST_DIR
find_git_root() {
  dir="$1"
  while [ "$dir" != "/" ] && [ -n "$dir" ]; do
    if [ -d "$dir/.git" ]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

GIT_ROOT=$(find_git_root "$DEST_DIR" || true)

if [ -z "$GIT_ROOT" ]; then
  echo "Error: No git repository found in parent directories of $DEST_DIR. Aborting (will not init a repo)." >&2
  exit 4
fi

echo "Found git repo at: $GIT_ROOT"
# compute path to stage relative to git root
REL_PATH=$(realpath --relative-to="$GIT_ROOT" "$DEST_DIR")
echo "Staging changes in repo root: $GIT_ROOT -> path: $REL_PATH"
cd "$GIT_ROOT"


# If the path was previously recorded as a submodule (gitlink), remove the cached entry so
# it becomes tracked as ordinary files. This handles the case where productstudio used to
# be a separate git repo.
git rm -rf --cached "$REL_PATH" 2>/dev/null || true

# Stage the productstudio folder (relative path)
git add -A "$REL_PATH"

if git diff --cached --quiet; then
  echo "No changes to commit in $REL_PATH."
else
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  git commit -m "deploy: $TIMESTAMP"
  echo "Committed changes with message: deploy: $TIMESTAMP"
  echo "Pushing to remote..."
  git push || {
    echo "git push failed. You may need to set the remote or authenticate." >&2
    exit 3
  }
fi

echo "Deploy complete."
