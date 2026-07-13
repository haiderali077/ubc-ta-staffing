interface ProgressBarProps {
  percentage: number;
  label?: string;
}

export function ProgressBar({
  percentage,
  label = "Progress:",
}: ProgressBarProps) {
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getProgressBgColor = () => {
    if (percentage >= 100) return "bg-green-50";
    if (percentage >= 75) return "bg-blue-50";
    if (percentage >= 50) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <div className="flex items-center gap-[8px]">
      {label && (
        <span className="text-[14px] text-[#6B7280] font-medium">{label}</span>
      )}
      <div
        className={`w-[120px] h-[10px] ${getProgressBgColor()} border border-gray-200 rounded-full overflow-hidden`}
      >
        <div
          className={`h-full ${getProgressColor()} rounded-full transition-all duration-500 ease-out relative`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white opacity-30 animate-pulse rounded-full"></div>
        </div>
      </div>
      <span
        className={`text-[14px] font-[600] min-w-[35px] ${
          percentage >= 100
            ? "text-green-600"
            : percentage >= 75
            ? "text-blue-600"
            : percentage >= 50
            ? "text-yellow-600"
            : "text-red-600"
        }`}
      >
        {percentage}%
      </span>
    </div>
  );
}
