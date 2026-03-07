const fs = require('fs');
const path = require('path');

function goalsPath(user) {
  return path.join(__dirname, `goals-${user}.json`);
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
