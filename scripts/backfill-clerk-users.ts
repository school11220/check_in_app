import 'dotenv/config';
import { clerkClient } from '@clerk/nextjs/server';
import { upsertUserFromClerk } from '../lib/user-sync';

type BackfillOptions = {
  dryRun: boolean;
  pageSize: number;
  maxUsers?: number;
};

function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);

  const dryRun = args.includes('--dry-run');

  const pageSizeArg = args.find((arg) => arg.startsWith('--page-size='));
  const maxUsersArg = args.find((arg) => arg.startsWith('--max-users='));

  const pageSize = pageSizeArg ? Number(pageSizeArg.split('=')[1]) : 100;
  const maxUsers = maxUsersArg ? Number(maxUsersArg.split('=')[1]) : undefined;

  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error('Invalid --page-size. Use a number between 1 and 500.');
  }

  if (maxUsers !== undefined && (!Number.isFinite(maxUsers) || maxUsers < 1)) {
    throw new Error('Invalid --max-users. Use a positive integer.');
  }

  return { dryRun, pageSize, maxUsers };
}

function getPrimaryEmail(clerkUser: any): string | null {
  const primaryId = clerkUser.primaryEmailAddressId;
  if (primaryId) {
    const primary = clerkUser.emailAddresses?.find((email: any) => email.id === primaryId);
    if (primary?.emailAddress) return primary.emailAddress;
  }

  return clerkUser.emailAddresses?.[0]?.emailAddress || null;
}

async function runBackfill() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Missing CLERK_SECRET_KEY. Set it in your environment before running backfill.');
  }

  if (!process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
    throw new Error('Missing POSTGRES_PRISMA_URL or DATABASE_URL. Set one database URL before running backfill.');
  }

  const options = parseArgs();
  const client = await clerkClient();

  let offset = 0;
  let processed = 0;
  let synced = 0;
  let skippedNoEmail = 0;
  let failed = 0;

  console.log('Starting Clerk user backfill...');
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no DB writes)' : 'WRITE'}`);
  console.log(`Page size: ${options.pageSize}`);
  if (options.maxUsers) {
    console.log(`Max users: ${options.maxUsers}`);
  }

  while (true) {
    const remaining = options.maxUsers ? options.maxUsers - processed : options.pageSize;
    const limit = Math.min(options.pageSize, Math.max(remaining, 0));

    if (limit <= 0) break;

    const users = await client.users.getUserList({
      limit,
      offset,
    });

    if (!users || users.data.length === 0) {
      break;
    }

    for (const clerkUser of users.data) {
      processed += 1;

      const email = getPrimaryEmail(clerkUser);
      if (!email) {
        skippedNoEmail += 1;
        console.warn(`Skipped (no email): ${clerkUser.id}`);
        continue;
      }

      try {
        if (!options.dryRun) {
          await upsertUserFromClerk(clerkUser);
        }
        synced += 1;
        console.log(`${options.dryRun ? '[DRY]' : '[SYNC]'} ${clerkUser.id} (${email})`);
      } catch (error) {
        failed += 1;
        console.error(`Failed for ${clerkUser.id}:`, error);
      }
    }

    offset += users.data.length;

    if (users.data.length < limit) {
      break;
    }
  }

  console.log('\nBackfill finished.');
  console.log(`Processed: ${processed}`);
  console.log(`Synced: ${synced}`);
  console.log(`Skipped (no email): ${skippedNoEmail}`);
  console.log(`Failed: ${failed}`);

  if (options.dryRun) {
    console.log('\nThis was a dry run. No database records were written.');
  }
}

runBackfill().catch((error: any) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Backfill failed: ${message}`);
  process.exit(1);
});
