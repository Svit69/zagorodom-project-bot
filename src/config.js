import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BOT_TOKEN =
  process.env.BOT_TOKEN ||
  '7342681760:AAF83qJhDE9KtFkK5h6eo89bFme8B1e_Tu0';

export const ADMIN_IDS = [
  265485424 // primary admin; extendable for more admins later
];

export const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
