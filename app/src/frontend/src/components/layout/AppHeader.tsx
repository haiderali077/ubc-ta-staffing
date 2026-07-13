import React from 'react';

interface HeaderProps {
  profileStatus: string;
}

export function Header({ profileStatus }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-[#E5E7EB] dark:border-gray-700">
      <div className="max-w-[1200px] mx-auto px-[24px] py-[16px] flex justify-between items-center">
        <h1 className="text-[24px] font-[600] text-[#1F2937] dark:text-white">TA Application Profile</h1>
        <div className="flex items-center gap-[16px]">
          <span className="text-[14px] text-[#6B7280] dark:text-gray-400">Status:</span>
          <span className={`text-[14px] font-[500] ${profileStatus === "Complete" ? "text-[#059669] dark:text-green-400" : "text-[#DC2626] dark:text-red-400"}`}>
            {profileStatus}
          </span>
        </div>
      </div>
    </header>
  );
} 