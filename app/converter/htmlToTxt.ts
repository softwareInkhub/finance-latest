export function convertHtmlToTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const html = e.target?.result as string;
        const div = document.createElement('div');
        div.innerHTML = html;
        const txt = div.innerText;
        resolve(txt);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 