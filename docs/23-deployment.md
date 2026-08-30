# Deployment

`vercel.json` identifies a Next.js deployment and region `sin1`. `next.config.ts` enables production PWA output to `public` and allows remote HTTP/HTTPS images. Build/install scripts are in `package.json`; Prisma generation runs during postinstall. README setup uses `prisma db push`, while a migration deployment process is absent. Required configuration is checked by `scripts/check-env.ts`; values must remain in secret environment configuration.
