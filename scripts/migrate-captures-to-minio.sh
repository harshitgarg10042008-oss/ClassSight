#!/usr/bin/env bash
set -euo pipefail

: "${MINIO_ENDPOINT:=http://127.0.0.1:9000}"
: "${MINIO_ACCESS_KEY:=minioadmin}"
: "${MINIO_SECRET_KEY:=minioadmin}"
: "${MINIO_BUCKET:=classsight-captures}"
: "${POSTGRES_HOST:=127.0.0.1}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=classsight}"
: "${POSTGRES_USER:=classsight}"
: "${POSTGRES_PASSWORD:=classsight_password}"
: "${CAPTURE_ROOT:=./data/captures}"

command -v mc >/dev/null || { echo 'mc is required'; exit 2; }
command -v psql >/dev/null || { echo 'psql is required'; exit 2; }
export PGPASSWORD="$POSTGRES_PASSWORD"
mc alias set classsight-minio "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
mc mb --ignore-existing "classsight-minio/$MINIO_BUCKET" >/dev/null

psql_args=(-h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -F $'\t' -c)
while IFS=$'\t' read -r session_id stored_path; do
  [ -n "$session_id" ] || continue
  [ -n "$stored_path" ] || continue
  if [[ "$stored_path" == captures/* ]]; then
    echo "SKIP session=$session_id already uses object key=$stored_path"
    continue
  fi
  if [ ! -f "$stored_path" ]; then
    echo "MISSING session=$session_id path=$stored_path" >&2
    exit 1
  fi
  filename=$(basename "$stored_path")
  object_key="captures/migrated-session-${session_id}-${filename}"
  mc cp "$stored_path" "classsight-minio/$MINIO_BUCKET/$object_key" >/dev/null
  local_hash=$(sha256sum "$stored_path" | awk '{print $1}')
  remote_hash=$(mc cat "classsight-minio/$MINIO_BUCKET/$object_key" | sha256sum | awk '{print $1}')
  if [ "$local_hash" != "$remote_hash" ]; then
    echo "HASH_MISMATCH session=$session_id local=$local_hash remote=$remote_hash" >&2
    exit 1
  fi
  escaped_key=${object_key//\'/\'\'}
  psql "${psql_args[@]}" "update attendance_sessions set captured_photo_path='$escaped_key' where id=$session_id;"
  echo "MIGRATED session=$session_id old=$stored_path new=$object_key sha256=$local_hash"
done < <(psql "${psql_args[@]}" 'select id, captured_photo_path from attendance_sessions where captured_photo_path is not null order by id')
