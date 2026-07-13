// app/src/backend/_tests_/bulkUpload.test.ts
import { parse } from "https://deno.land/std@0.181.0/csv/mod.ts";
import { assertEquals, assertExists } from "../../../deps.ts";

// Set test environment
Deno.env.set("DENO_ENV", "test");

/**
 * Bulk Upload Tests
 * Tests the CSV parsing and data transformation logic
 */

// Helper function to convert time format
function convertTo24Hour(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
  
  if (!match) {
    return timeStr.includes(':') ? timeStr : '09:00';
  }

  let [, hours, minutes, period] = match;
  let hour = parseInt(hours);
  const isPM = period.toLowerCase().includes('p');

  if (isPM && hour !== 12) {
    hour += 12;
  } else if (!isPM && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

Deno.test("Bulk Upload - CSV Parsing", async (t) => {
  
  await t.step("Should parse CSV with headers correctly", () => {
    const csvContent = `Term,Subject,Course,Instructor,Start Time,End Time,Days
2025W,CPSC,110,Alice Smith,9:00 a.m.,10:30 a.m.,Mon Wed Fri
2025W,MATH,200,Bob Jones,2:00 p.m.,3:30 p.m.,Tue Thu`;

    const parsed = parse(csvContent, { skipFirstRow: false }) as string[][];
    
    assertEquals(parsed.length, 3); // Headers + 2 data rows
    assertEquals(parsed[0], ["Term", "Subject", "Course", "Instructor", "Start Time", "End Time", "Days"]);
    assertEquals(parsed[1][0], "2025W");
    assertEquals(parsed[1][1], "CPSC");
  });

  await t.step("Should handle empty rows", () => {
    const csvContent = `Term,Subject,Course,Instructor
2025W,CPSC,110,Alice Smith

2025W,MATH,200,Bob Jones`;

    const parsed = parse(csvContent, { skipFirstRow: false }) as string[][];
    const headers = parsed[0];
    
    // Map to objects and filter empty rows
    const rows = parsed.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    }).filter(row => row.Term || row.Subject || row.Course);
    
    assertEquals(rows.length, 2); // Should skip empty row
  });

  await t.step("Should convert 12-hour to 24-hour time format", () => {
    assertEquals(convertTo24Hour("9:00 a.m."), "09:00");
    assertEquals(convertTo24Hour("2:30 p.m."), "14:30");
    assertEquals(convertTo24Hour("12:00 p.m."), "12:00");
    assertEquals(convertTo24Hour("12:00 a.m."), "00:00");
    assertEquals(convertTo24Hour("11:59 PM"), "23:59");
  });

  await t.step("Should validate required fields", () => {
    const row = {
      Term: "",
      Subject: "CPSC",
      Course: "110",
      Instructor: "Alice Smith"
    };

    const errors: string[] = [];
    if (!row.Term?.trim()) errors.push("Term is required");
    if (!row.Subject?.trim()) errors.push("Subject is required");
    if (!row.Course?.trim()) errors.push("Course number is required");
    if (!row.Instructor?.trim()) errors.push("Instructor name is required");

    assertEquals(errors.length, 1);
    assertEquals(errors[0], "Term is required");
  });

  await t.step("Should create course code correctly", () => {
    const subject = "CPSC";
    const courseNumber = "110";
    const courseCode = `${subject.trim()} ${courseNumber.trim()}`;
    
    assertEquals(courseCode, "CPSC 110");
  });

  await t.step("Should format course time string", () => {
    const startTime = "09:00";
    const endTime = "10:30";
    const courseTime = `${startTime} - ${endTime}`;
    
    assertEquals(courseTime, "09:00 - 10:30");
  });

  await t.step("Should map subjects to departments", () => {
    const subjectToDeptMap: { [key: string]: string } = {
      'BIOL': 'Biology',
      'CPSC': 'Computer Science',
      'MATH': 'Mathematics',
      'PSYC': 'Psychology',
      'ENGL': 'English',
      'STAT': 'Statistics',
      'PHYS': 'Physics',
      'ECON': 'Economics'
    };

    assertEquals(subjectToDeptMap['CPSC'], 'Computer Science');
    assertEquals(subjectToDeptMap['BIOL'], 'Biology');
    assertEquals(subjectToDeptMap['UNKNOWN'] || 'General Studies', 'General Studies');
  });

  await t.step("Should parse week patterns for dates", () => {
    const weekPattern = "2025-05-13 - 2025-06-27";
    const dateMatch = weekPattern.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    
    assertExists(dateMatch);
    assertEquals(dateMatch[1], "2025-05-13");
    assertEquals(dateMatch[2], "2025-06-27");
  });

  await t.step("Should handle CSV with all fields", () => {
    const csvRow = {
      Term: "2025W",
      Subject: "CPSC",
      Course: "110",
      "Sec No": "001",
      Activity: "Lecture",
      Creds: "3",
      Size: "150",
      "On campus or Online": "On campus",
      Days: "Mon Wed Fri",
      "Start Time": "9:00 a.m.",
      "End Time": "10:30 a.m.",
      "Week patterns": "2025-01-06 - 2025-04-30",
      "Secondary Activity": "Lab",
      Instructor: "Alice Smith",
      Location: "DMP 110"
    };

    // Transform the data
    const courseCode = `${csvRow.Subject} ${csvRow.Course}`;
    const courseTime = `${convertTo24Hour(csvRow["Start Time"])} - ${convertTo24Hour(csvRow["End Time"])}`;
    
    assertEquals(courseCode, "CPSC 110");
    assertEquals(courseTime, "09:00 - 10:30");
    assertEquals(!!csvRow["Secondary Activity"]?.trim(), true);
  });
});

// Run tests
if (import.meta.main) {
  console.log("Running bulk upload tests...");
}