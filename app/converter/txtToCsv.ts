export function convertTxtToCsv(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Simple split by lines, then by whitespace
        const lines = text.split(/\r?\n/);
        const csv = lines.map(line => line.split(/\s+/).join(",")).join("\n");
        resolve(csv);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 