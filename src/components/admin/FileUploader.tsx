'use client'

import * as React from 'react'
import { Upload, X, FileCheck } from 'lucide-react'

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (index: number) => void
  selectedFiles: File[]
  accept?: string
  multiple?: boolean
}

export function FileUploader({
  onFilesSelected,
  onRemoveFile,
  selectedFiles,
  accept = '.cdr,.ai,.pdf,.otf,.png,.jpg',
  multiple = true,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = React.useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files)
      onFilesSelected(filesArray)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files)
      onFilesSelected(filesArray)
    }
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`w-full py-8 px-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20'
        }`}
      >
        <input
          type="file"
          id="file-upload-input"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
        <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-full border border-slate-200/60 dark:border-slate-800 shadow-sm mb-1">
            <Upload className="h-5 w-5 text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Arraste arquivos aqui ou clique para selecionar
          </span>
          <span className="text-xs text-slate-450 dark:text-slate-400">
            Formatos aceitos: CDR, AI, PDF, OTF, PNG ou JPG
          </span>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="flex flex-col gap-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950/10">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Arquivos selecionados ({selectedFiles.length})
          </span>
          <div className="flex flex-col gap-1.5">
            {selectedFiles.map((file, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100/55 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10"
              >
                <div className="flex items-center gap-2 max-w-[85%]">
                  <FileCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase shrink-0">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(idx)}
                  className="p-1 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors text-slate-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
