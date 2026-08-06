import * as XLSX from 'xlsx';

export const exportToExcel = (data: Record<string, any>[], filename: string, sheetName: string = 'Báo cáo') => {
  if (!data || data.length === 0) return;

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Calculate auto column widths
    const keys = Object.keys(data[0]);
    const colWidths = keys.map(key => {
      const maxLen = Math.max(
        key.toString().length,
        ...data.map(row => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('XLSX Export error, using UTF-8 BOM CSV fallback:', error);
    const headers = Object.keys(data[0]);
    let csvContent = '\uFEFF';
    csvContent += headers.join(',') + '\n';

    data.forEach(row => {
      const rowValues = headers.map(header => {
        let val = row[header] ?? '';
        if (typeof val === 'string') {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvContent += rowValues.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
