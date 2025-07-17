export function convertJsonToTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const txt = Array.isArray(json)
          ? json.map(row => Object.values(row).join(' ')).join('\n')
          : JSON.stringify(json, null, 2);
        resolve(txt);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 