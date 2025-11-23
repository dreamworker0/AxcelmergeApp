export enum ProcessStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface FileData {
  id: string;
  file: File;
  status: ProcessStatus;
  errorMessage?: string;
  rowCount?: number;
}

export interface MergedResult {
  fileName: string;
  totalRows: number;
  blob: Blob;
}