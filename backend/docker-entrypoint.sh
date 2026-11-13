#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    printf '%s\n' 'APP_KEY must be configured in the environment.' >&2
    exit 1
fi

port="${PORT:-10000}"
case "$port" in
    ''|*[!0-9]*)
        printf '%s\n' 'PORT must contain only digits.' >&2
        exit 1
        ;;
esac

if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    printf '%s\n' 'PORT must be between 1 and 65535.' >&2
    exit 1
fi

printf 'Listen 0.0.0.0:%s\n' "$port" > /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${port}>/" \
    /etc/apache2/sites-available/000-default.conf

php artisan config:cache

printf '%s\n' 'Running pending Laravel database migrations...' >&2
if ! php artisan migrate --force; then
    printf '%s\n' 'Database migrations failed; refusing to start Apache.' >&2
    exit 1
fi

if [ "${RUN_DEMO_SEEDER:-false}" = "true" ]; then
    printf '%s\n' 'Running the demo database seeder...' >&2
    if ! php artisan db:seed --force; then
        printf '%s\n' 'Demo database seeding failed; refusing to start Apache.' >&2
        exit 1
    fi
fi

if [ "$#" -eq 0 ]; then
    set -- apache2-foreground
fi

exec "$@"
