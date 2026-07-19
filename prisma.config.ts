import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

const envFile = fs.existsSync(path.resolve(__dirname, '.env.development'))
  ? '.env.development'
  : '.env'

dotenv.config({ path: envFile })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
})