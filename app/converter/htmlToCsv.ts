export function convertHtmlToCsv(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const html = e.target?.result as string;
        const div = document.createElement('div');
        div.innerHTML = html;
        const rows = Array.from(div.querySelectorAll('tr'));
        const csv = rows.map(row =>
          Array.from(row.querySelectorAll('td,th'))
            .map(cell => '"' + (cell as HTMLElement).innerText.replace(/"/g, '""') + '"')
            .join(',')
        ).join('\n');
        resolve(csv);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 