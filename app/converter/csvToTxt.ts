export function convertCsvToTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        // Remove commas, just join by space
        const txt = csv.split(/\r?\n/).map(line => line.split(',').join(' ')).join('\n');
        resolve(txt);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 