const fs = require('fs');

try {
  const csvPath = '../supercharged_clovers.csv';
  const csvData = fs.readFileSync(csvPath, 'utf8');
  
  // Replace "d4" with "d4 tried to call no answer"
  // But be careful to match "d4 " or "d4 -" to avoid matching inside other words if any.
  // Actually, string replacement is straightforward:
  // We'll split by line, and if a line contains 'd4', we replace it.
  
  const lines = csvData.split('\n');
  let updated = 0;
  
  const newLines = lines.map(line => {
    if (line.includes('d4') && !line.includes('d4 tried to call no answer')) {
      updated++;
      return line.replace('d4', 'd4 tried to call no answer');
    }
    return line;
  });

  fs.writeFileSync(csvPath, newLines.join('\n'), 'utf8');
  console.log(`Successfully updated ${updated} lines in supercharged_clovers.csv`);
} catch (error) {
  console.error('Error updating CSV:', error);
}
