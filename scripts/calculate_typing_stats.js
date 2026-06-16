
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'entertrained_stats_2026-06-16.json');
const readmePath = path.join(__dirname, '..', 'README.md');
const statsPlaceholderStart = '<!-- START_TYPING_STATS -->';
const statsPlaceholderEnd = '<!-- END_TYPING_STATS -->';

// 1. Read and parse data
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

// 2. Aggregate stats for Alice in Wonderland
const aliceBookIds = Object.keys(data.chaptersStats).filter(key =>
    key.startsWith('lewis-carroll--alices-adventures-in-wonderland')
);

if (aliceBookIds.length === 0) {
    console.error('No "Alice in Wonderland" stats found.');
    process.exit(1);
}

let aggregatedBookStats = {};
for (const bookId of aliceBookIds) {
    const currentBookStats = data.chaptersStats[bookId];
    for (const chapterKey in currentBookStats) {
        aggregatedBookStats[`${bookId}-${chapterKey}`] = currentBookStats[chapterKey];
    }
}

let totalChars = 0;
let totalTimeMs = 0;
let weightedWpmSum = 0;
let weightedAccSum = 0;
let totalAccWeight = 0;

for (const key in aggregatedBookStats) {
    const stats = aggregatedBookStats[key];
    if (stats.type === 'typed') {
        totalChars += stats.length;
        weightedWpmSum += stats.wpm.value * stats.wpm.weight;
        weightedAccSum += stats.acc.value * stats.acc.weight;
        totalAccWeight += stats.acc.weight;
        totalTimeMs += stats.time;
    }
}

// 3. Calculate final values
const avgWpm = totalChars > 0 ? weightedWpmSum / totalChars : 0;
const avgAcc = totalAccWeight > 0 ? weightedAccSum / totalAccWeight : 0;
const totalTimeMinutes = totalTimeMs / 1000 / 60;
const hours = Math.floor(totalTimeMinutes / 60);
const minutes = Math.round(totalTimeMinutes % 60);
const totalWords = Math.round(totalChars / 5);

// 4. Generate the new markdown content
const wpmBadge = `https://img.shields.io/badge/WPM-${avgWpm.toFixed(2)}-blue`;
const accBadge = `https://img.shields.io/badge/Accuracy-${(avgAcc * 100).toFixed(2)}%25-green`;
const timeBadge = `https://img.shields.io/badge/Time-${hours}h%20${minutes}m-informational`;
const wordsBadge = `https://img.shields.io/badge/Words-${totalWords}-lightgrey`;
const charsBadge = `https://img.shields.io/badge/Chars-${totalChars}-lightgrey`;

const newContent = `<details>
    <summary>A few details about the last completed book</summary>
    <table>
      <tr>
        <td width="120" valign="top">
          <a href="https://en.wikipedia.org/wiki/Alice%27s_Adventures_in_Wonderland">
            <img src="assets/Alice's_Adventures_in_Wonderland_cover_(1865).jpg" alt="Alice's Adventures in Wonderland book cover" width="100">
          </a>
        </td>
        <td valign="top">
          <strong><a href="https://entertrained.app/books/lewis-carroll--alices-adventures-in-wonderland">Alice's Adventures in Wonderland</a></strong>
          <br><br>
          <img src="${wpmBadge}" alt="WPM"> <img src="${accBadge}" alt="Accuracy"> <img src="${timeBadge}" alt="Time Spent"> <br> <img src="${wordsBadge}" alt="Words"> <img src="${charsBadge}" alt="Characters">
            </td>
          </tr>
        </table>
      </details>`;

// 5. Update README.md
const readmeContent = fs.readFileSync(readmePath, 'utf-8');
const startIndex = readmeContent.indexOf(statsPlaceholderStart);
const endIndex = readmeContent.indexOf(statsPlaceholderEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find placeholder tags in README.md');
    process.exit(1);
}

const before = readmeContent.substring(0, startIndex + statsPlaceholderStart.length);
const after = readmeContent.substring(endIndex);

const updatedReadme = `${before}
${newContent}
${after}`.replace(/\n?$/, '\n');

fs.writeFileSync(readmePath, updatedReadme);

console.log('README.md updated successfully with new typing stats.');
