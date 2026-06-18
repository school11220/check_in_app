/**
 * Validate that required environment variables are present.
 * Run with: npx tsx scripts/check-env.ts
 *
 * Exits with code 1 in production-like environments if anything required is missing.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

const REQUIRED = [
    'POSTGRES_PRISMA_URL',
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
];

const RECOMMENDED = [
    'TICKET_SECRET_KEY',
    'ADMIN_BOOTSTRAP_SECRET',
    'CRON_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
];

const OPTIONAL = [
    'PHONEPE_API_URL',
    'PHONEPE_MERCHANT_ID',
    'PHONEPE_SALT_KEY',
    'PHONEPE_SALT_INDEX',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SENDER_EMAIL',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'FAST2SMS_API_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_BASE_URL',
];

const isProd = process.env.NODE_ENV === 'production';

let failed = false;
const missing = (name: string) => `${name} is missing`;

console.log('Environment check\n-----------------');

for (const key of REQUIRED) {
    if (!process.env[key]) {
        console.error(`  [REQUIRED] ${missing(key)}`);
        failed = true;
    } else {
        console.log(`  [REQUIRED] ${key} OK`);
    }
}

for (const key of RECOMMENDED) {
    if (!process.env[key]) {
        console.warn(`  [RECOMMENDED] ${missing(key)} (${key})`);
    } else {
        console.log(`  [RECOMMENDED] ${key} OK`);
    }
}

console.log(`\n${OPTIONAL.length} optional keys (omitted from output)`);

if (failed) {
    console.error('\nEnvironment check FAILED');
    if (isProd) {
        process.exit(1);
    } else {
        console.warn('Continuing in non-production mode.');
    }
} else {
    console.log('\nEnvironment check passed.');
}
