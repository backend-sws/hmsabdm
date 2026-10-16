#!/bin/sh
set -e

echo "Starting Backend Production Entrypoint..."

cd /var/www

# 1. Set directory permissions
mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         bootstrap/cache
chmod -R 777 storage bootstrap/cache || true

# 2. Wait for PostgreSQL database connection
echo "Waiting for database connection..."
until php -r "
    try {
        \$host = getenv('DB_HOST') ?: 'postgres';
        \$port = getenv('DB_PORT') ?: '5432';
        \$db   = getenv('DB_DATABASE') ?: 'hms_abdm';
        \$user = getenv('DB_USERNAME') ?: 'hms_user';
        \$pass = getenv('DB_PASSWORD') ?: '';
        \$pdo = new PDO(\"pgsql:host=\$host;port=\$port;dbname=\$db\", \$user, \$pass);
        exit(0);
    } catch (PDOException \$e) {
        exit(1);
    }
"; do
    echo "Database is unavailable - sleeping..."
    sleep 2
done

# 3. Generate APP_KEY if missing
if [ -f .env ] && ! grep -q "^APP_KEY=base64:" .env; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# 4. Run migrations and optimize on main web process
if [ "$1" = "php-fpm" ]; then
    echo "Running migrations..."
    php artisan migrate --force

    echo "Creating storage symlink..."
    php artisan storage:link --force || true

    echo "Optimizing configuration, routes, and views..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

echo "Backend ready. Executing command..."
exec "$@"
