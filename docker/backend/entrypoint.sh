#!/bin/sh
set -e

echo "Starting Backend Entrypoint..."

# 1. Ensure .env exists
if [ ! -f /var/www/.env ]; then
    echo "Creating .env from .env.example..."
    cp /var/www/.env.example /var/www/.env
fi

# 2. Install composer dependencies if missing
if [ ! -d /var/www/vendor ]; then
    echo "Vendor directory not found. Running composer install..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# 3. Generate APP_KEY if missing
if ! grep -q "^APP_KEY=base64:" /var/www/.env; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# 4. Set directory permissions
echo "Setting storage and bootstrap/cache permissions..."
chmod -R 777 /var/www/storage /var/www/bootstrap/cache || true

# 5. Wait for PostgreSQL database to be ready
echo "Waiting for database connection..."
until php -r "
    try {
        \$host = getenv('DB_HOST') ?: 'postgres';
        \$port = getenv('DB_PORT') ?: '5432';
        \$db   = getenv('DB_DATABASE') ?: 'hms_abdm';
        \$user = getenv('DB_USERNAME') ?: 'hms_user';
        \$pass = getenv('DB_PASSWORD') ?: 'hms_pass';
        \$pdo = new PDO(\"pgsql:host=\$host;port=\$port;dbname=\$db\", \$user, \$pass);
        exit(0);
    } catch (PDOException \$e) {
        exit(1);
    }
"; do
    echo "Database is unavailable - sleeping..."
    sleep 2
done

echo "Database is up - running migrations and seeders..."
php artisan migrate --force
php artisan db:seed --force

echo "Backend setup complete. Starting server..."
exec "$@"
