import React, { useState } from "react";

interface FileUploadProps {
  uploadUrl: string;
  onUploadStart?: () => void;
  onUploadSuccess: (filename: string) => void;
  onUploadError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  uploadUrl,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [".pdf", ".doc", ".docx"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      onUploadError("Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onUploadError("File size must be less than 10MB.");
      return;
    }

    onUploadStart?.();

    const formData = new FormData();
    formData.append("file", file);

    try {
      if (!uploadUrl) throw new Error("No upload endpoint specified");

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const data = await response.json();
      onUploadSuccess(data.transcript_url || data.filename);
    } catch (error) {
      console.error("Error uploading file:", error);
      onUploadError(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200

          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'

          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="text-gray-600 dark:text-gray-400">

            <p className="text-sm font-medium">
              Drop your transcript here, or{" "}
              <span className="text-blue-600 dark:text-blue-400 font-semibold">browse</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              PDF, DOC, DOCX up to 10MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
