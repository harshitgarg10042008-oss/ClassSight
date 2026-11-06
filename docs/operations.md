# Operations

Use `python scripts/dev.py status` to inspect services and `python scripts/dev.py reset` to create a PostgreSQL backup and archive development/test roster data by deactivating it. The reset is intended to be idempotent.

PostgreSQL backups are written under the ignored `runtime-check/backups/` directory. MinIO stores private photos and RabbitMQ carries asynchronous recognition work in the local compose stack.
