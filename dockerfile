# Используем официальный образ PHP с Apache
FROM php:7.4-apache

# Включаем mod_rewrite
RUN a2enmod rewrite

# Копируем проект
COPY . /var/www/html/

# Создаём папку userdata и даём права
RUN mkdir -p /var/www/html/userdata && chmod -R 777 /var/www/html/userdata

# Открываем порт 80
EXPOSE 80

# Запускаем Apache
CMD ["apache2-foreground"]