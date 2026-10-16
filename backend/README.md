<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

## Gmail OTP email setup

For local Gmail SMTP delivery, configure the backend environment with:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-google-app-password
MAIL_FROM_ADDRESS=your-gmail-address@gmail.com
MAIL_FROM_NAME="VehiCare"
```

Enable 2-Step Verification on the Google account and create an App Password.
Use that generated password for `MAIL_PASSWORD`; a normal Google password will
not work. Keep it only in the local environment configuration and never commit
it. The authenticated Gmail address should also be the sender address.

After changing mail environment values, clear Laravel's cached configuration
from the backend directory with `php artisan config:clear`. Check
`storage/logs/laravel.log` for `[OtpService] Failed to send OTP email` if
delivery still fails. A successful SMTP submission means Gmail accepted the
message for processing; also check Spam and verify that the Gmail account has
not blocked the message.

## Admin module deployment notes

The admin modules add migrations for subscription provenance and manual grants,
AI request telemetry and runtime limits, feedback, admin notification
deduplication, announcements, and administrator action history. Back up the
database and inspect the migration ledger and affected tables before applying
them. If a MySQL migration previously failed, do not assume its DDL was rolled
back; confirm whether its columns or tables were partially created first.

Announcement scheduling and delivery require two persistent processes:

- Run Laravel's scheduler every minute (`php artisan schedule:run` from cron
  or the host scheduler). It publishes due notices and redispatches published
  notices that still have recipients awaiting delivery.
- Run a queue worker for the configured queue (`php artisan queue:work
  --queue=default`). The default queue connection is `database`; this repository
  includes the jobs-table migration. Keep the worker supervised in production.
  The development `composer dev` process already includes a queue listener.
  Confirm the deployed `QUEUE_CONNECTION` is an asynchronous driver: a `sync`
  connection processes jobs inside the publishing request and defeats the
  asynchronous delivery behavior. No queue or environment setting is changed
  by this code.

Immediate announcements are queued after saving; they are not delivered in the
admin HTTP request. Delivery is retryable and idempotent per announcement/user.
Announcements only go to active accounts with in-app notifications enabled at
delivery time. Changing that preference does not delete or hide notifications
already delivered; it controls later delivery attempts. Free and Premium
audiences are snapshotted when delivery begins, using the same plan and expiry
rules as `User::checkSubscriptionStatus()`; recipients created after publication
are excluded.

Selected-user announcements require the `announcement_recipients` migration.
Production Reverb deployments must set `REVERB_APP_KEY`, `REVERB_APP_SECRET`,
and a comma-separated `REVERB_ALLOWED_ORIGINS` value; wildcard origins and
development credentials are not accepted as a production Reverb configuration.

Admin runtime AI settings only adjust consultation and supported media limits.
Values are persisted in the database and are bounded by the request/API upload
ceilings. Do not roll back migrations containing feedback, announcement,
notification-delivery, audit, or completed AI-usage history without exporting
that history first.

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
