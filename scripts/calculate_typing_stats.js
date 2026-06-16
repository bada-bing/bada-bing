
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'entertrained_stats_2026-06-16.json');
const readmePath = path.join(__dirname, '..', 'README.md');
const statsPlaceholderStart = '<!-- START_TYPING_STATS -->';
const statsPlaceholderEnd = '<!-- END_TYPING_STATS -->';

// 1. Read and parse data
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

const bookAssets = {
    'lewis-carroll--alices-adventures-in-wonderland': {
        coverPath: "assets/Alice's_Adventures_in_Wonderland_cover_(1865).jpg",
        coverUrl: 'https://en.wikipedia.org/wiki/Alice%27s_Adventures_in_Wonderland',
    },
    'oscar-wilde--the-importance-of-being-earnest': {
        coverPath: 'assets/The_Importance_of_Being_Earnest.jpg',
        coverUrl: 'https://en.wikipedia.org/wiki/The_Importance_of_Being_Earnest',
    },
};

const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const getBookStats = (slug, details) => {
    let totalChars = 0;
    let totalTimeMs = 0;
    let weightedWpmSum = 0;
    let weightedAccSum = 0;
    let totalAccWeight = 0;

    for (const [chapterId, chapterStats] of Object.entries(data.chaptersStats)) {
        if (!chapterId.startsWith(`${slug}__`)) {
            continue;
        }

        for (const stats of Object.values(chapterStats)) {
            if (stats.type === 'typed') {
                totalChars += stats.length;
                weightedWpmSum += stats.wpm.value * stats.wpm.weight;
                weightedAccSum += stats.acc.value * stats.acc.weight;
                totalAccWeight += stats.acc.weight;
                totalTimeMs += stats.time;
            }
        }
    }

    const avgWpm = totalChars > 0 ? weightedWpmSum / totalChars : 0;
    const avgAcc = totalAccWeight > 0 ? weightedAccSum / totalAccWeight : 0;
    const totalTimeMinutes = totalTimeMs / 1000 / 60;
    const hours = Math.floor(totalTimeMinutes / 60);
    const minutes = Math.round(totalTimeMinutes % 60);

    return {
        slug,
        title: details.title,
        author: details.author,
        totalChars,
        complete: totalChars >= details.length,
        avgWpm,
        avgAcc,
        hours,
        minutes,
        totalWords: Math.round(totalChars / 5),
    };
};

const completedBooks = Object.entries(data.booksDetails)
    .map(([slug, details]) => getBookStats(slug, details))
    .filter(book => book.complete);

if (completedBooks.length === 0) {
    console.error('No completed book stats found.');
    process.exit(1);
}

const renderBadges = book => {
    const wpmBadge = `https://img.shields.io/badge/WPM-${book.avgWpm.toFixed(2)}-blue`;
    const accBadge = `https://img.shields.io/badge/Accuracy-${(book.avgAcc * 100).toFixed(2)}%25-green`;
    const timeBadge = `https://img.shields.io/badge/Time-${book.hours}h%20${book.minutes}m-informational`;
    const wordsBadge = `https://img.shields.io/badge/Words-${book.totalWords}-lightgrey`;
    const charsBadge = `https://img.shields.io/badge/Chars-${book.totalChars}-lightgrey`;

    return `<img src="${wpmBadge}" alt="WPM"> <img src="${accBadge}" alt="Accuracy"> <img src="${timeBadge}" alt="Time Spent"> <br> <img src="${wordsBadge}" alt="Words"> <img src="${charsBadge}" alt="Characters">`;
};

const renderBookRow = book => {
    const asset = bookAssets[book.slug];
    const coverCell = asset
        ? `<td width="120" valign="top">
          <a href="${asset.coverUrl}">
            <img src="${asset.coverPath}" alt="${escapeHtml(book.title)} book cover" width="100">
          </a>
        </td>`
        : `<td width="120" valign="top">
          ${escapeHtml(book.author)}
        </td>`;

    return `      <tr>
        ${coverCell}
        <td valign="top">
          <strong><a href="https://entertrained.app/books/${book.slug}">${escapeHtml(book.title)}</a></strong>
          <br>
          <em>${escapeHtml(book.author)}</em>
          <br><br>
          ${renderBadges(book)}
        </td>
      </tr>`;
};

// 4. Generate the new markdown content
const bookRows = completedBooks.map(renderBookRow).join('\n');

const newContent = `<details>
    <summary>A few details about completed Entertrained books</summary>
    <table>
${bookRows}
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
