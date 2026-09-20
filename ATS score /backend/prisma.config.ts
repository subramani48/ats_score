import path from 'node:path';
import { defineConfig } from 'prisma/config';

import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Placeholder only, so `prisma generate` works without a .env file. Real commands need DATABASE_URL in .env.
    url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/ats_score_db',
  },
});
