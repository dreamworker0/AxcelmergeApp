import React from 'react';
import { FileData, ProcessStatus } from '../types';
import { FileSpreadsheet, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileCardProps {
  fileData: FileData;
  onRemove: (id: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ fileData, onRemove }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 animate-slide-up bg-white",
      fileData.status === ProcessStatus.ERROR ? "border-red-200 bg-red-50/50" : "border-slate-200 hover:border-blue-300 hover:shadow-sm"
    )}>
      <div className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
        fileData.status === ProcessStatus.ERROR ? "bg-red-100 text-red-600" : "bg-green-100 text-[#1D6F42]"
      )}>
        <FileSpreadsheet className="h-6 w-6" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {fileData.file.name}
          </p>
          <span className="text-xs text-slate-400 font-medium">
            {formatSize(fileData.file.size)}
          </span>
        </div>
        
        <div className="flex items-center text-xs">
          {fileData.status === ProcessStatus.PENDING && (
            <span className="text-slate-500">대기 중</span>
          )}
          {fileData.status === ProcessStatus.PROCESSING && (
            <span className="flex items-center text-blue-600">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 처리 중...
            </span>
          )}
          {fileData.status === ProcessStatus.SUCCESS && (
            <span className="flex items-center text-green-600 font-medium">
              <CheckCircle2 className="mr-1 h-3 w-3" /> 
              {fileData.rowCount ? `${fileData.rowCount} 행` : '구조 확인 완료'}
            </span>
          )}
          {fileData.status === ProcessStatus.ERROR && (
            <span className="flex items-center text-red-600 font-medium truncate" title={fileData.errorMessage}>
              <AlertCircle className="mr-1 h-3 w-3 shrink-0" /> 
              {fileData.errorMessage || "오류 발생"}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(fileData.id)}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="파일 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};