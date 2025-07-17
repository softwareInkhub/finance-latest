import jsPDF from 'jspdf';

export function convertCsvToPdf(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const doc = new jsPDF();
        const lines = csv.split(/\r?\n/);
        lines.forEach((line, idx) => {
          doc.text(line, 10, 10 + idx * 10);
        });
        const pdfBlob = doc.output('blob');
        resolve(pdfBlob);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
} 