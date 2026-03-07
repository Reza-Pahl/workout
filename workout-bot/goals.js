const fs = require('fs');
const path = require('path');

const GOALS_DIR = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : __dirname;

function goalsPath(user) {
  return path.join(GOALS_DIR, `goals-${user}.json`);
}

function getGoals(user) {
  try {
    return JSON.parse(fs.readFileSync(goalsPath(user), 'utf8'));
  } catch {
    return [];
  }
}

function saveGoals(user, goals) {
  fs.writeFileSync(goalsPath(user), JSON.stringify(goals, null, 2));
}

module.exports = { getGoals, saveGoals };
