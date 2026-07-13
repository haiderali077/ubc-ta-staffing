import React, { useState, useEffect } from "react";
import FileUpload from "./FileUpload";

interface TranscriptUploadProps {
  userId: number;
  transcriptUrl?: string | null;
}

const TranscriptUpload: React.FC<TranscriptUploadProps> = ({
  userId,
  transcriptUrl,
}) => {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(transcriptUrl);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setCurrentUrl(transcriptUrl);
  }, [transcriptUrl]);

  // Use the backend URL for the transcript link
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  return (
    <div className="mb-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-3">
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
            Transcript Upload
          </h4>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload your unofficial transcript (PDF, DOC, or DOCX files only)
        </p>

        <FileUpload
          uploadUrl={`/api/profile/${userId}/transcript/upload`}
          onUploadStart={() => {
            setIsUploading(true);
            setStatus("idle");
            setError(null);
          }}
          onUploadSuccess={(newUrl) => {
            setIsUploading(false);
            setStatus("success");
            setError(null);
            setCurrentUrl(newUrl.startsWith("/") ? newUrl : `/${newUrl}`);
          }}
          onUploadError={(err) => {
            setIsUploading(false);
            setStatus("error");
            setError(err);
          }}
        />

        {/* Loading state */}
        {isUploading && (
          <div className="flex items-center mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
            <svg
              className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600 dark:text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm text-blue-700 dark:text-blue-300">Uploading transcript...</span>
          </div>
        )}

        {/* Success state */}
        {status === "success" && (
          <div className="flex items-center mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Transcript uploaded successfully!
            </span>
          </div>
        )}

        {/* Error state */}
        {status === "error" && error && (
          <div className="flex items-center mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* View uploaded transcript */}
        {currentUrl && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Transcript uploaded
                </span>
              </div>
              <a
                href={`${backendUrl}${currentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptUpload;
