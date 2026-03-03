import { useRef, useState } from 'react';

interface FileUploaderProps {
  label: string;
  description?: string;
  accepted: string;
  onFileSelected: (file: File) => void;
}

export function FileUploader({ label, description, accepted, onFileSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    onFileSelected(fileList[0]);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
          isDragging ? 'border-cyan-500 bg-cyan-50' : 'border-slate-300 bg-white hover:border-cyan-400'
        }`}
      >
        <p className="text-sm text-slate-700">Drop file here or click to browse</p>
        <p className="mt-1 text-xs text-slate-500">Accepted: {accepted}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accepted}
        className="hidden"
        onChange={(event) => handleFile(event.target.files)}
      />
    </div>
  );
}
