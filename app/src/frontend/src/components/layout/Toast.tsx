import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number; // ms
  onClose: () => void;
}

const typeStyles = {
  success: "bg-emerald-50 border-emerald-400 text-emerald-700",
  error: "bg-red-50 border-red-400 text-red-700",
  info: "bg-blue-50 border-blue-400 text-blue-700",
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg border ${typeStyles[type]} flex items-center gap-2 animate-fade-in`}
      role="alert"
    >
      <span className="font-medium">
        {type === "success" && "✅"}
        {type === "error" && "❌"}
        {type === "info" && "ℹ️"}
      </span>
      <span>{message}</span>
      <button
        className="ml-4 text-lg font-bold text-gray-400 hover:text-gray-700 focus:outline-none"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
