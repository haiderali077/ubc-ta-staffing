import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { getAvailableTerms } from "../../api/applicationApi";

interface Term {
  term_id?: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "active" | "inactive" | "upcoming";
  created_at?: string;
  updated_at?: string;
}

interface AvailabilityPreferencesProps {
  availability: string;
  setAvailability: (value: string) => void;
  maxHours: string;
  setMaxHours: (value: string) => void;
  preferredTerm: string;
  setPreferredTerm: (value: string) => void;
  onInputChange: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => Promise<void>;
  terms?: Term[]; // Make optional since it's not used
}

// Define cell position type
interface CellPosition {
  row: number;
  col: number;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
// Generate time slots with 30-minute intervals from 8:00 to 21:00 (9 PM)
const timeSlots = Array.from({ length: 27 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minutes}`;
});

export function AvailabilityPreferencesSection({
  availability,
  setAvailability,
  maxHours,
  setMaxHours,
  preferredTerm,
  setPreferredTerm,
  onInputChange,
  saveStatus,
  onSave,
}: AvailabilityPreferencesProps) {
  const [validationErrors, setValidationErrors] = useState({
    availability: false,
  });
  const [terms, setTerms] = useState<Term[]>([]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [selectionMode, setSelectionMode] = useState<boolean | null>(null); // true = marking unavailable, false = marking available, null = not set yet
  const [startCell, setStartCell] = useState<CellPosition | null>(null);
  const [currentCell, setCurrentCell] = useState<CellPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Fetch available terms on component mount
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const availableTerms = await getAvailableTerms();
        setTerms(availableTerms);
      } catch (error) {
        console.error("Failed to fetch terms:", error);
        // Keep the component functional even if terms fetch fails
      }
    };

    fetchTerms();
  }, []);

  // Parse or initialize availability grid
  let initialGrid: boolean[][] = [];
  try {
    if (availability) {
      // Parse the existing availability data
      const parsedGrid = JSON.parse(availability);

      // Check if the parsed grid has the right dimensions
      if (Array.isArray(parsedGrid) && parsedGrid.length > 0) {
        if (parsedGrid.length === timeSlots.length) {
          // Grid already has the right number of rows
          initialGrid = parsedGrid;
        } else {
          // Need to transform the grid to match the new timeSlots
          // Create a new empty grid with the right dimensions
          initialGrid = Array(timeSlots.length)
            .fill(null)
            .map(() => Array(days.length).fill(false));

          // If we're converting from hourly to half-hourly
          if (parsedGrid.length < timeSlots.length) {
            // For each hour in the old grid
            parsedGrid.forEach((row: boolean[], rowIndex: number) => {
              // Map each hour to two half-hour slots
              const newRowIndex = rowIndex * 2;
              if (newRowIndex < timeSlots.length) {
                row.forEach((cell: boolean, colIndex: number) => {
                  // Copy the hour's availability to both half-hour slots
                  initialGrid[newRowIndex][colIndex] = cell;
                  if (newRowIndex + 1 < timeSlots.length) {
                    initialGrid[newRowIndex + 1][colIndex] = cell;
                  }
                });
              }
            });
          } else {
            // If we're converting from a different format, just use what we can
            parsedGrid.forEach((row: boolean[], rowIndex: number) => {
              if (rowIndex < timeSlots.length) {
                row.forEach((cell: boolean, colIndex: number) => {
                  if (colIndex < days.length) {
                    initialGrid[rowIndex][colIndex] = cell;
                  }
                });
              }
            });
          }
        }
      } else {
        // Invalid format, create new grid
        initialGrid = Array(timeSlots.length)
          .fill(null)
          .map(() => Array(days.length).fill(false));
      }
    } else {
      // No existing data, create new grid
      initialGrid = Array(timeSlots.length)
        .fill(null)
        .map(() => Array(days.length).fill(false));
    }
  } catch (error) {
    console.error("Error parsing availability data:", error);
    initialGrid = Array(timeSlots.length)
      .fill(null)
      .map(() => Array(days.length).fill(false));
  }

  const [grid, setGrid] = useState<boolean[][]>(initialGrid);

  // Track changes for different parts of the form
  const [gridChanged, setGridChanged] = useState<boolean>(false);
  const [formFieldsChanged, setFormFieldsChanged] = useState<boolean>(false);

  // Combined state to check if anything has changed
  const hasChanged = gridChanged || formFieldsChanged;
  const updateGridWithSelection = () => {
    if (!startCell || !currentCell) return;

    const minRow = Math.min(startCell.row, currentCell.row);
    const maxRow = Math.max(startCell.row, currentCell.row);
    const minCol = Math.min(startCell.col, currentCell.col);
    const maxCol = Math.max(startCell.col, currentCell.col);

    if (selectionMode === null) return;

    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (
          rowIndex >= minRow &&
          rowIndex <= maxRow &&
          colIndex >= minCol &&
          colIndex <= maxCol
        ) {
          return selectionMode; // Set to selection mode value
        }
        return cell;
      })
    );

    setGrid(newGrid);
    setAvailability(JSON.stringify(newGrid));
    setValidationErrors((prev) => ({ ...prev, availability: false }));
    setGridChanged(true);
    onInputChange();
  };

  // Handle mouse events for drag-to-select
  const handleMouseDown = (row: number, col: number) => {
    setIsDragging(true);
    setStartCell({ row, col });
    setCurrentCell({ row, col });

    // Set selection mode based on the initial cell state
    // If cell is already unavailable (true), we're making it available (false)
    // If cell is available (false), we're making it unavailable (true)
    setSelectionMode(!grid[row][col]);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      updateGridWithSelection();
      setIsDragging(false);
      setStartCell(null);
      setCurrentCell(null);
      setSelectionMode(null);
    }
  };

  const handleMouseMove = (event: MouseEvent<HTMLTableElement>) => {
    if (!isDragging || !gridRef.current) return;

    const table = event.currentTarget;
    const tableRect = table.getBoundingClientRect();
    const x = event.clientX - tableRect.left;
    const y = event.clientY - tableRect.top;

    // Find the cell under the mouse
    const cells = table.querySelectorAll("td[data-row][data-col]");
    for (const cell of Array.from(cells)) {
      const cellRect = cell.getBoundingClientRect();
      const cellLeft = cellRect.left - tableRect.left;
      const cellRight = cellRect.right - tableRect.left;
      const cellTop = cellRect.top - tableRect.top;
      const cellBottom = cellRect.bottom - tableRect.top;

      if (x >= cellLeft && x <= cellRight && y >= cellTop && y <= cellBottom) {
        const row = parseInt(cell.getAttribute("data-row") || "0");
        const col = parseInt(cell.getAttribute("data-col") || "0");
        if (currentCell?.row !== row || currentCell?.col !== col) {
          setCurrentCell({ row, col });
        }
        break;
      }
    }
  };

  const handleSave = async () => {
    const errors = {
      availability: !grid.flat().some(Boolean),
    };
    setValidationErrors(errors);
    if (errors.availability) return;

    await onSave();
    // Reset changed states after successful save
    setGridChanged(false);
    setFormFieldsChanged(false);
  };

  // Cell rendering helper
  const renderCell = (rowIdx: number, colIdx: number) => {
    const isSelected =
      isDragging &&
      startCell &&
      currentCell &&
      rowIdx >= Math.min(startCell.row, currentCell.row) &&
      rowIdx <= Math.max(startCell.row, currentCell.row) &&
      colIdx >= Math.min(startCell.col, currentCell.col) &&
      colIdx <= Math.max(startCell.col, currentCell.col);

    // Safely access grid values to prevent "Cannot read properties of undefined" error
    const isUnavailable = grid && grid[rowIdx] && grid[rowIdx][colIdx] === true;

    return (
      <td
        key={`${rowIdx}-${colIdx}`}
        className="p-[1px] relative transition-all duration-150 w-1/6"
        data-row={rowIdx}
        data-col={colIdx}
      >
        <div
          className={`
            w-full h-7 cursor-pointer flex items-center justify-center
            transition-all duration-200 ease-in-out
            border border-[#CCCCCC]
            ${
              isUnavailable
                ? "bg-[#FFC9C9] hover:bg-[#FFB3B3]"
                : "bg-[#D5F5E3] hover:bg-[#C5E5D3]"
            }
            ${isSelected ? "shadow-inner ring-1 ring-[#3498DB]" : ""}
            ${isSelected && !isUnavailable ? "bg-[#AED6F1]" : ""}
            ${isSelected && isUnavailable ? "bg-[#FFB3B3]" : ""}
          `}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent text selection
            handleMouseDown(rowIdx, colIdx);
          }}
        >
          {isUnavailable && (
            <div className="flex flex-col items-center justify-center">
              <svg
                className="w-4 h-4 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>
      </td>
    );
  };

  const getSaveButtonClass = (status: string) => {
    const baseClass =
      "h-[44px] px-[20px] rounded-md text-[14px] font-medium transition-all duration-200 shadow-sm";
    switch (status) {
      case "saving":
        return `${baseClass} bg-gray-200 text-gray-500 cursor-not-allowed`;
      case "saved":
        return `${baseClass} bg-emerald-100 text-emerald-700 border border-emerald-200`;
      case "error":
        return `${baseClass} bg-red-100 text-red-700 border border-red-200`;
      default:
        return `${baseClass} bg-blue-500 hover:bg-blue-600 text-white`;
    }
  };

  const getSaveButtonText = (status: string) => {
    switch (status) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved!";
      case "error":
        return "Error";
      default:
        return "Save Section";
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-[12px] border border-gray-200 dark:border-gray-700 shadow-sm">
      <header className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-[24px] border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-[20px] font-[600] text-gray-800 dark:text-white flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Availability & Preferences
        </h2>
        <p className="text-[14px] text-gray-600 dark:text-gray-400 mt-[4px]">
          Specify your availability and term preferences
        </p>
      </header>
      <div className="p-[24px] bg-white dark:bg-gray-800 space-y-[24px]">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label
              className={`block text-[16px] font-[500] ${
                validationErrors.availability ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"
              }`}
            >
              Weekly Unavailability *
            </label>
            {validationErrors.availability && (
              <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 px-2 py-1 rounded-full">
                Please indicate your unavailable times
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select times when you are <strong>NOT available</strong> for TA
            duties
          </p>
          <div
            className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-300"
            ref={gridRef}
          >
            <div className="grid grid-cols-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
              <div className="py-3 text-center border-r border-blue-500 font-medium">
                <div className="text-xs opacity-75 mb-1">Time</div>
              </div>
              {days.map((day) => (
                <div key={day} className="py-3 text-center">
                  <div className="text-xs opacity-75 mb-1">
                    {day.slice(0, 3)}
                  </div>
                  <div className="text-sm font-semibold">{day}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <tbody>
                  {timeSlots.map((timeSlot, rowIdx) => (
                    <tr
                      key={timeSlot}
                      className={rowIdx % 2 === 0 ? "bg-gray-50 dark:bg-gray-700" : "bg-white dark:bg-gray-800"}
                    >
                      <td className="border-r border-gray-200 dark:border-gray-600 px-4 w-24 text-center text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {timeSlot}
                      </td>
                      {days.map((_, colIdx) => renderCell(rowIdx, colIdx))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-600">
                    <div className="w-4 h-4 rounded bg-[#D6EAF8] border border-gray-300 dark:border-gray-500"></div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-600">
                    <div className="w-4 h-4 rounded bg-[#FFC9C9] border border-[#FFB3B3]">
                      <svg
                        className="w-4 h-4 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      Not available
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 italic px-2 py-1 bg-white rounded-md border border-gray-200">
                  Click and drag to select multiple time slots
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[24px] max-lg:grid-cols-1 mt-8">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
            <label
              htmlFor="maxHours"
              className="text-[15px] font-[500] text-gray-700 dark:text-gray-300 mb-2 flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Maximum Hours per Week
            </label>
            <select
              id="maxHours"
              value={maxHours}
              onChange={(e) => {
                setMaxHours(e.target.value);
                setFormFieldsChanged(true);
                onInputChange();
              }}
              className="w-full h-[50px] px-[16px] border border-gray-300 dark:border-gray-600 rounded-md text-[16px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all shadow-sm hover:border-blue-400"
            >
              <option value="">Select hours</option>
              <option value="6">6 hours</option>
              <option value="13">12 hours</option>
            </select>
          </div>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
            <label
              htmlFor="preferredTerm"
              className="text-[15px] font-[500] text-gray-700 dark:text-gray-300 mb-2 flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Preferred Term
            </label>
            <select
              id="preferredTerm"
              value={preferredTerm}
              onChange={(e) => {
                setPreferredTerm(e.target.value);
                setFormFieldsChanged(true);
                onInputChange();
              }}
              className="w-full h-[50px] px-[16px] border border-gray-300 dark:border-gray-600 rounded-md text-[16px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all shadow-sm hover:border-blue-400"
            >
              <option value="">Select preferred term</option>
              {terms.map((term) => (
                <option key={term.term_id} value={term.name}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => {
              const newGrid = Array(timeSlots.length)
                .fill(null)
                .map(() => Array(days.length).fill(false));
              setGrid(newGrid);
              setAvailability(JSON.stringify(newGrid));
              setGridChanged(true);
              onInputChange();
            }}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 h-[44px] px-[20px] rounded-md text-[14px] font-medium transition-all duration-200 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear All
          </button>

          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || !hasChanged}
            className={`${getSaveButtonClass(
              saveStatus
            )} flex items-center gap-2 transition-transform active:scale-95 hover:shadow ${
              !hasChanged ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {saveStatus === "saving" && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            )}
            {saveStatus === "saved" && (
              <svg
                className="w-4 h-4"
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
            )}
            {saveStatus === "error" && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {getSaveButtonText(saveStatus)}
          </button>
        </div>
      </div>
    </section>
  );
}
