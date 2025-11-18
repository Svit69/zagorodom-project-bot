import fs from 'node:fs';
import path from 'node:path';

export default class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.ensureFile();
  }

  ensureFile() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({ users: [], projects: [] }, null, 2), 'utf8');
    }
  }

  read() {
    const raw = fs.readFileSync(this.dbPath, 'utf8');
    return JSON.parse(raw || '{"users":[],"projects":[]}');
  }

  write(data) {
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
  }
}
