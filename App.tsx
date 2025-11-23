import React, { useState, useCallback } from 'react';
import { Dropzone } from './components/Dropzone';
import { FileCard } from './components/FileCard';
import { Button } from './components/Button';
import { FileData, ProcessStatus, MergedResult } from './types';
import { readExcelFile, mergeExcelFiles } from './utils/excelService';
import { FileDown, RefreshCw, Layers, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [mergedResult, setMergedResult] = useState<MergedResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const newFiles: FileData[] = selectedFiles.map(file => ({
      id: uuidv4(),
      file,
      status: ProcessStatus.PENDING
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setMergedResult(null); 
    setGlobalError(null);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedResult(null);
    setGlobalError(null);
  }, []);

  const resetAll = () => {
    setFiles([]);
    setMergedResult(null);
    setGlobalError(null);
    setIsProcessing(false);
  };

  const handleMerge = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setGlobalError(null);
    
    // Reset statuses
    setFiles(prev => prev.map(f => ({ ...f, status: ProcessStatus.PROCESSING, errorMessage: undefined })));

    try {
      // Step 1: Validate all files structure against the first one
      const rawFiles = files.map(f => f.file);
      
      // We will re-read files to validate individually and update UI
      const firstFile = rawFiles[0];
      let masterHeaders: string[];
      
      try {
        const { headers } = await readExcelFile(firstFile);
        masterHeaders = headers;
        setFiles(prev => prev.map((f, idx) => idx === 0 ? { ...f, status: ProcessStatus.SUCCESS } : f));
      } catch (e) {
        setFiles(prev => prev.map((f, idx) => idx === 0 ? { ...f, status: ProcessStatus.ERROR, errorMessage: "파일을 읽을 수 없습니다." } : f));
        throw new Error("첫 번째 파일을 읽는 중 오류가 발생했습니다.");
      }

      // Check others
      let hasError = false;
      
      for (let i = 1; i < files.length; i++) {
        try {
          const { headers } = await readExcelFile(files[i].file);
          const isMatch = headers.length === masterHeaders.length && headers.every((h, j) => h === masterHeaders[j]);
          
          if (isMatch) {
             setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: ProcessStatus.SUCCESS } : f));
          } else {
             hasError = true;
             setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: ProcessStatus.ERROR, errorMessage: "열 구조 불일치" } : f));
          }
        } catch (e) {
           hasError = true;
           setFiles(prev => prev.map(f => f.id === files[i].id ? { ...f, status: ProcessStatus.ERROR, errorMessage: "파일 읽기 실패" } : f));
        }
      }

      if (hasError) {
        throw new Error("일부 파일의 구조가 일치하지 않아 병합할 수 없습니다.");
      }

      // If validation passed, proceed to merge
      const blob = await mergeExcelFiles(rawFiles);
      
      setMergedResult({
        fileName: `merged_excel_${new Date().toISOString().slice(0, 10)}.xlsx`,
        totalRows: 0, // Not calculating strictly to save double processing
        blob
      });

    } catch (error: any) {
      console.error(error);
      setGlobalError(error.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!mergedResult) return;
    const url = window.URL.createObjectURL(mergedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mergedResult.fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
            <Layers className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Excel Merger
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            같은 열(Column) 구조를 가진 여러 엑셀 파일을 업로드하세요. <br/>
            순식간에 하나의 파일로 합쳐드립니다.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">사용 팁</p>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-blue-700/90">
              <li>첫 번째로 업로드된 파일이 <strong>기준 파일</strong>이 됩니다.</li>
              <li>모든 파일은 기준 파일과 동일한 헤더(첫 번째 줄)를 가져야 합니다.</li>
              <li>데이터는 파일 목록 순서대로 합쳐집니다.</li>
            </ul>
          </div>
        </div>

        {/* Main Interface */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Dropzone */}
            <Dropzone onFilesSelected={handleFilesSelected} disabled={isProcessing} />

            {/* Global Error */}
            {globalError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <p className="text-sm font-medium text-red-700">{globalError}</p>
              </div>
            )}

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                  <span>총 {files.length}개 파일</span>
                  <button 
                    onClick={resetAll} 
                    className="text-slate-400 hover:text-slate-600 flex items-center gap-1 hover:underline"
                    disabled={isProcessing}
                  >
                    <RefreshCw className="w-3 h-3" /> 초기화
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                  {files.map(file => (
                    <FileCard 
                      key={file.id} 
                      fileData={file} 
                      onRemove={isProcessing ? () => {} : removeFile} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              안전한 로컬 처리: 파일은 서버로 전송되지 않습니다.
            </div>
            
            <div className="flex w-full sm:w-auto gap-3">
              {mergedResult ? (
                <>
                  <Button onClick={resetAll} variant="secondary" className="flex-1 sm:flex-none">
                    새로 만들기
                  </Button>
                  <Button onClick={downloadFile} variant="excel" className="flex-1 sm:flex-none font-bold shadow-green-200">
                    <FileDown className="mr-2 h-4 w-4" />
                    합쳐진 파일 다운로드
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleMerge} 
                  disabled={files.length < 2} 
                  isLoading={isProcessing}
                  className="w-full sm:w-auto min-w-[140px]"
                >
                  {files.length < 2 ? '파일을 더 추가하세요' : '병합 시작하기'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;