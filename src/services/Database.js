import fs from 'node:fs';
import path from 'node:path';

const defaultData = {
  users: [],
  projects: [],
  rewardMessage: '',
  rewardRequests: []
};

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
      fs.writeFileSync(this.dbPath, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  }

  read() {
    const raw = fs.readFileSync(this.dbPath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      ...defaultData,
      ...parsed,
      users: parsed.users || [],
      projects: parsed.projects || [],
      rewardRequests: parsed.rewardRequests || []
    };
  }

  write(data) {
    const merged = {
      ...defaultData,
      ...data,
      users: data.users || [],
      projects: data.projects || [],
      rewardRequests: data.rewardRequests || []
    };
    fs.writeFileSync(this.dbPath, JSON.stringify(merged, null, 2), 'utf8');
  }
}
