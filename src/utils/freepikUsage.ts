import fs from 'fs';
import path from 'path';

const USAGE_FILE = path.join(process.cwd(), 'freepik_usage.json');

export function incrementFreepikUsage() {
  const today = new Date().toISOString().slice(0, 10);
  let usage: Record<string, number> = {};
  if (fs.existsSync(USAGE_FILE)) {
    usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  }
  usage[today] = (usage[today] || 0) + 1;
  fs.writeFileSync(USAGE_FILE, JSON.stringify(usage));
}

export function getFreepikUsageToday() {
  const today = new Date().toISOString().slice(0, 10);
  if (!fs.existsSync(USAGE_FILE)) return 0;
  const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  return usage[today] || 0;
} 