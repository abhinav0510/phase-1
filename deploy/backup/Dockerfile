# The backup job's image. scripts/backup.sh builds it on the VPS the first time it runs.
#   pg_dump / pg_restore  copy the database (version 17, at least as new as Supabase's)
#   age                   encrypts each snapshot to a public key, so the server can't read old backups
#   rclone                copies snapshots off the server (Backblaze B2, S3, Google Drive, ...)
#   curl, jq, openssl     download Storage files, n8n workflows and the Pilot sheet
FROM postgres:17-alpine
RUN apk add --no-cache age rclone curl jq openssl su-exec
COPY --chmod=755 sidana-backup.sh /usr/local/bin/sidana-backup
COPY --chmod=755 sidana-restore-test.sh /usr/local/bin/sidana-restore-test
ENTRYPOINT []
CMD ["sidana-backup"]
