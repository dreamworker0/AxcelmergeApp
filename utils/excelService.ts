import * as XLSX from 'xlsx';

export const readExcelFile = async (file: File): Promise<{ headers: string[]; data: any[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON (array of arrays) to easily extract headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          reject(new Error("파일이 비어있습니다."));
          return;
        }

        const headers = jsonData[0] as string[];
        // Remove header row from data
        const rows = jsonData.slice(1);

        resolve({ headers, data: rows });
      } catch (error) {
        reject(new Error("엑셀 파일을 읽는 중 오류가 발생했습니다."));
      }
    };

    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file);
  });
};

export const mergeExcelFiles = async (files: File[]): Promise<Blob> => {
  if (files.length === 0) throw new Error("병합할 파일이 없습니다.");

  let masterHeaders: string[] | null = null;
  let mergedData: any[] = [];

  for (const file of files) {
    const { headers, data } = await readExcelFile(file);

    if (!masterHeaders) {
      masterHeaders = headers;
      // Add headers as the first row for the final output
      mergedData.push(headers);
    } else {
      // Validate structure
      const isStructureMatch = 
        headers.length === masterHeaders.length &&
        headers.every((h, i) => h === masterHeaders![i]);

      if (!isStructureMatch) {
        throw new Error(`파일 "${file.name}"의 열 구조가 기준 파일과 다릅니다.`);
      }
    }

    // Add rows
    mergedData = mergedData.concat(data);
  }

  // Create new workbook
  const newWorkbook = XLSX.utils.book_new();
  const newWorksheet = XLSX.utils.aoa_to_sheet(mergedData);
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "MergedData");

  // Write to buffer
  const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};