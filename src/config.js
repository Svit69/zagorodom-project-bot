import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const BOT_TOKEN = process.env.BOT_TOKEN || '';

const adminIdsFromEnv = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => Number(id.trim()))
  .filter(Boolean);

export const ADMIN_IDS = adminIdsFromEnv.length ? adminIdsFromEnv : [265485424];

export const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
