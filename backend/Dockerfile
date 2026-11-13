FROM php:8.4-apache

ENV APP_ENV=production \
    APP_DEBUG=false \
    APP_NAME=GameVault \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=info \
    SESSION_SECURE_COOKIE=true \
    SESSION_SAME_SITE=lax \
    PORT=10000

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev libonig-dev libpq-dev libzip-dev unzip \
    && docker-php-ext-install -j"$(nproc)" bcmath curl mbstring opcache pdo_pgsql zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

RUN printf '%s\n' \
    'opcache.enable=1' \
    'opcache.enable_cli=0' \
    'opcache.memory_consumption=128' \
    'opcache.validate_timestamps=0' \
    > /usr/local/etc/php/conf.d/zz-opcache-production.ini

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

COPY . .

RUN php --version \
    && php -m \
    && composer --version \
    && COMPOSER_ALLOW_SUPERUSER=1 composer check-platform-reqs --lock --no-dev -vvv 2>&1 \
    && COMPOSER_ALLOW_SUPERUSER=1 composer install \
        -vvv \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --optimize-autoloader 2>&1 \
    && COMPOSER_ALLOW_SUPERUSER=1 composer check-platform-reqs --no-dev -vvv 2>&1 \
    && mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker-entrypoint.sh /usr/local/bin/gamevault-entrypoint
RUN chmod 755 /usr/local/bin/gamevault-entrypoint

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/gamevault-entrypoint"]
CMD ["apache2-foreground"]
