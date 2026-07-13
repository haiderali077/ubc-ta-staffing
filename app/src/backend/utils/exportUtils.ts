import { CourseAllocationReportData, HoursComparisonReportData, StudentAssignmentReportData } from '../../database/models/export.ts';

export interface ExportOptions {
    format: 'csv' | 'pdf' | 'json';
    reportType: 'course-allocations' | 'student-assignments' | 'hours-comparison';
    term?: string;
    includeDetails?: boolean;
    filters?: {
        department?: string;
        minHours?: number;
        maxHours?: number;
        status?: string;
    };
}

export class ExportUtils {
    // Convert data to CSV format with proper escaping
    static generateCSV(data: any[], headers: string[]): string {
        const csvRows: string[] = [];
        
        // Add headers
        csvRows.push(headers.map(h => this.escapeCSVValue(h)).join(','));
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                const key = this.headerToKey(header);
                let value = this.getNestedValue(row, key);
                
                // Handle special cases
                if (key === 'assigned_students' && Array.isArray(value)) {
                    value = value.map((s: any) => s.name).join('; ');
                } else if (key === 'assignments' && Array.isArray(value)) {
                    value = value.map((a: any) => `${a.course_code} (${a.term})`).join('; ');
                }
                
                return this.escapeCSVValue(value);
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    // Escape CSV values properly
    private static escapeCSVValue(value: any): string {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        
        // Check if value needs escaping
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }

    // Convert header to object key
    private static headerToKey(header: string): string {
        return header.toLowerCase().replace(/ /g, '_');
    }

    // Get nested object value safely
    private static getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
    }

    // Convert camelCase to snake_case
    static camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    // Generate course allocation CSV with all fields
    static generateCourseAllocationCSV(data: CourseAllocationReportData[]): string {
        const headers = [
            'Course Code',
            'Course Title', 
            'Term',
            'Instructor Name',
            'Total TA Slots',
            'Filled Slots',
            'Remaining Slots',
            'Fill Rate (%)',
            'Hours Requested',
            'Hours Assigned',
            'Hours Utilization (%)',
            'Assigned Students',
            'Student Emails',
            'Student Majors',
            'Allocation Dates',
            'Notes'
        ];

        const processedData = data.map(course => ({
            course_code: course.course_code,
            course_title: course.course_title,
            term: course.term,
            instructor_name: course.instructor_name,
            total_ta_slots: course.total_ta_slots,
            filled_slots: course.filled_slots,
            remaining_slots: course.remaining_slots,
            fill_rate: course.total_ta_slots > 0 ? 
                Math.round((course.filled_slots / course.total_ta_slots) * 100) : 0,
            hours_requested: course.hours_requested,
            hours_assigned: course.hours_assigned,
            hours_utilization: course.hours_requested > 0 ? 
                Math.round((course.hours_assigned / course.hours_requested) * 100) : 0,
            assigned_students: course.assigned_students.map(s => s.name).join('; '),
            student_emails: course.assigned_students.map(s => s.email).join('; '),
            student_majors: course.assigned_students.map(s => s.major).join('; '),
            allocation_dates: course.assigned_students
                .map(s => new Date(s.allocated_at).toLocaleDateString()).join('; '),
            notes: course.assigned_students.map(s => s.notes || 'N/A').join('; ')
        }));

        return this.generateCSV(processedData, headers);
    }

    // Generate student assignment CSV
    static generateStudentAssignmentCSV(data: StudentAssignmentReportData[]): string {
        const headers = [
            'Student Name',
            'Student Email',
            'Student Number',
            'Major',
            'Total Assignments',
            'Total Hours',
            'Average Hours',
            'Courses Assigned',
            'Terms',
            'Assignment Status',
            'Latest Assignment Date'
        ];

        const processedData = data.map(student => ({
            student_name: student.student_name,
            student_email: student.student_email,
            student_number: student.student_number,
            major: student.major,
            total_assignments: student.total_assignments,
            total_hours: student.total_hours,
            average_hours: student.total_assignments > 0 ? 
                Math.round(student.total_hours / student.total_assignments) : 0,
            courses_assigned: student.assignments
                .map(a => `${a.course_code} - ${a.course_title}`).join('; '),
            terms: [...new Set(student.assignments.map(a => a.term))].join('; '),
            assignment_status: [...new Set(student.assignments.map(a => a.status))].join('; '),
            latest_assignment_date: student.assignments.length > 0 ?
                new Date(Math.max(...student.assignments
                    .map(a => new Date(a.allocated_at).getTime())))
                    .toLocaleDateString() : 'N/A'
        }));

        return this.generateCSV(processedData, headers);
    }

    // Generate hours comparison CSV
    static generateHoursComparisonCSV(data: HoursComparisonReportData[]): string {
        const headers = [
            'Course Code',
            'Course Title',
            'Term',
            'Instructor Name',
            'Hours Requested',
            'Hours Assigned',
            'Hours Difference',
            'TA Slots Requested',
            'TA Slots Filled',
            'Unfilled Slots',
            'Utilization Rate (%)',
            'Status'
        ];

        const processedData = data.map(course => ({
            course_code: course.course_code,
            course_title: course.course_title,
            term: course.term,
            instructor_name: course.instructor_name,
            hours_requested: course.hours_requested,
            hours_assigned: course.hours_assigned,
            hours_difference: course.hours_requested - course.hours_assigned,
            ta_slots_requested: course.ta_slots_requested,
            ta_slots_filled: course.ta_slots_filled,
            unfilled_slots: course.ta_slots_requested - course.ta_slots_filled,
            utilization_rate: course.utilization_rate,
            status: course.utilization_rate >= 100 ? 'Fully Staffed' : 
                    course.utilization_rate >= 75 ? 'Adequately Staffed' : 
                    course.utilization_rate >= 50 ? 'Understaffed' : 'Critically Understaffed'
        }));

        return this.generateCSV(processedData, headers);
    }

    // Generate PDF HTML with enhanced styling
    static generatePDFHTML(data: any[], title: string, reportType: string): string {
        const timestamp = new Date().toLocaleString();
        const headers = this.getHeadersForReportType(reportType, data);
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #1f2937;
                    background: #f9fafb;
                    padding: 20px;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                .header {
                    border-bottom: 3px solid #3b82f6;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                h1 {
                    color: #1e40af;
                    font-size: 28px;
                    margin-bottom: 10px;
                }
                .meta {
                    color: #6b7280;
                    font-size: 14px;
                }
                .summary {
                    background: #eff6ff;
                    border: 1px solid #dbeafe;
                    border-radius: 6px;
                    padding: 20px;
                    margin-bottom: 30px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-top: 15px;
                }
                .summary-item {
                    text-align: center;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e40af;
                }
                .summary-label {
                    font-size: 12px;
                    color: #6b7280;
                    text-transform: uppercase;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background: #f3f4f6;
                    color: #374151;
                    font-weight: 600;
                    text-align: left;
                    padding: 12px;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 2px solid #e5e7eb;
                }
                td {
                    padding: 12px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 14px;
                }
                tr:hover {
                    background: #f9fafb;
                }
                tr:nth-child(even) {
                    background: #f9fafb;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }
                .logo {
                    font-size: 20px;
                    font-weight: bold;
                    color: #3b82f6;
                    margin-bottom: 5px;
                }
                @media print {
                    body { background: white; }
                    .container { box-shadow: none; padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">AllocAid</div>
                    <h1>${title}</h1>
                    <div class="meta">
                        <p>Generated on: ${timestamp}</p>
                        <p>Total Records: ${data.length}</p>
                    </div>
                </div>
                
                ${this.generateSummarySection(data, reportType)}
                
                <div class="data-section">
                    <h2 style="font-size: 20px; margin-bottom: 15px; color: #374151;">Detailed Report Data</h2>
                    ${this.generateTable(data, headers, reportType)}
                </div>
                
                <div class="footer">
                    <p>This report was generated by AllocAid TA Management System</p>
                    <p>© ${new Date().getFullYear()} University of British Columbia</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Get headers based on report type
    private static getHeadersForReportType(reportType: string, data: any[] = []): string[] {
        switch (reportType) {
            case 'course-allocations':
                return ['Course Code', 'Title', 'Term', 'Instructor', 'Filled/Total', 'Hours', 'Status'];
            case 'student-assignments':
                return ['Student Name', 'Email', 'Major', 'Assignments', 'Total Hours', 'Courses'];
            case 'hours-comparison':
                return ['Course', 'Term', 'Requested', 'Assigned', 'Utilization', 'Status'];
            default:
                return Object.keys(data[0] || {});
        }
    }

    // Generate summary section for PDF
    private static generateSummarySection(data: any[], reportType: string): string {
        let summaryHTML = '<div class="summary"><h3 style="margin-bottom: 10px;">Report Summary</h3>';
        
        switch (reportType) {
            case 'course-allocations':
                const totalSlots = data.reduce((sum, c) => sum + (c.total_ta_slots || 0), 0);
                const filledSlots = data.reduce((sum, c) => sum + (c.filled_slots || 0), 0);
                const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
                
                summaryHTML += `
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-value">${data.length}</div>
                            <div class="summary-label">Total Courses</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${filledSlots}/${totalSlots}</div>
                            <div class="summary-label">Slots Filled</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${fillRate}%</div>
                            <div class="summary-label">Fill Rate</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'student-assignments':
                const totalStudents = data.length;
                const totalAssignments = data.reduce((sum, s) => sum + (s.total_assignments || 0), 0);
                const avgAssignments = totalStudents > 0 ? (totalAssignments / totalStudents).toFixed(1) : 0;
                
                summaryHTML += `
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-value">${totalStudents}</div>
                            <div class="summary-label">Total Students</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${totalAssignments}</div>
                            <div class="summary-label">Total Assignments</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${avgAssignments}</div>
                            <div class="summary-label">Avg per Student</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'hours-comparison':
                const totalRequested = data.reduce((sum, c) => sum + (c.hours_requested || 0), 0);
                const totalAssigned = data.reduce((sum, c) => sum + (c.hours_assigned || 0), 0);
                const overallUtilization = totalRequested > 0 ? 
                    Math.round((totalAssigned / totalRequested) * 100) : 0;
                
                summaryHTML += `
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-value">${totalRequested}</div>
                            <div class="summary-label">Hours Requested</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${totalAssigned}</div>
                            <div class="summary-label">Hours Assigned</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${overallUtilization}%</div>
                            <div class="summary-label">Overall Utilization</div>
                        </div>
                    </div>
                `;
                break;
        }
        
        summaryHTML += '</div>';
        return summaryHTML;
    }

    // Generate table for PDF
    private static generateTable(data: any[], headers: string[], reportType: string): string {
        let tableHTML = '<table><thead><tr>';
        
        headers.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
        
        tableHTML += '</tr></thead><tbody>';
        
        data.forEach(row => {
            tableHTML += '<tr>';
            
            switch (reportType) {
                case 'course-allocations':
                    tableHTML += `
                        <td>${row.course_code}</td>
                        <td>${row.course_title}</td>
                        <td>${row.term}</td>
                        <td>${row.instructor_name}</td>
                        <td>${row.filled_slots}/${row.total_ta_slots}</td>
                        <td>${row.hours_assigned}/${row.hours_requested}</td>
                        <td>${this.getStatusBadge(row.filled_slots, row.total_ta_slots)}</td>
                    `;
                    break;
                    
                case 'student-assignments':
                    tableHTML += `
                        <td>${row.student_name}</td>
                        <td>${row.student_email}</td>
                        <td>${row.major}</td>
                        <td>${row.total_assignments}</td>
                        <td>${row.total_hours}</td>
                        <td>${row.assignments.map((a: any) => a.course_code).join(', ')}</td>
                    `;
                    break;
                    
                case 'hours-comparison':
                    tableHTML += `
                        <td>${row.course_code} - ${row.course_title}</td>
                        <td>${row.term}</td>
                        <td>${row.hours_requested}</td>
                        <td>${row.hours_assigned}</td>
                        <td>${row.utilization_rate}%</td>
                        <td>${this.getUtilizationStatus(row.utilization_rate)}</td>
                    `;
                    break;
                    
                default:
                    headers.forEach(header => {
                        const key = this.headerToKey(header);
                        tableHTML += `<td>${row[key] || ''}</td>`;
                    });
            }
            
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        return tableHTML;
    }

    // Get status badge HTML
    private static getStatusBadge(filled: number, total: number): string {
        const fillRate = total > 0 ? (filled / total) * 100 : 0;
        let color, text;
        
        if (fillRate >= 100) {
            color = '#10b981';
            text = 'Fully Staffed';
        } else if (fillRate >= 75) {
            color = '#3b82f6';
            text = 'Adequate';
        } else if (fillRate >= 50) {
            color = '#f59e0b';
            text = 'Understaffed';
        } else {
            color = '#ef4444';
            text = 'Critical';
        }
        
        return `<span style="color: ${color}; font-weight: 600;">${text}</span>`;
    }

    // Get utilization status
    private static getUtilizationStatus(rate: number): string {
        let color, text;
        
        if (rate >= 100) {
            color = '#10b981';
            text = 'Optimal';
        } else if (rate >= 75) {
            color = '#3b82f6';
            text = 'Good';
        } else if (rate >= 50) {
            color = '#f59e0b';
            text = 'Low';
        } else {
            color = '#ef4444';
            text = 'Critical';
        }
        
        return `<span style="color: ${color}; font-weight: 600;">${text}</span>`;
    }

    // Get report title
    static getReportTitle(reportType: string, term?: string): string {
        const baseTitle = {
            'course-allocations': 'Course TA Allocations Report',
            'student-assignments': 'Student TA Assignments Report',
            'hours-comparison': 'TA Hours Comparison Report'
        }[reportType] || 'Export Report';
        
        return term ? `${baseTitle} - ${term}` : baseTitle;
    }

    // Get filename
    static getFilename(reportType: string, format: string, term?: string): string {
        const timestamp = new Date().toISOString().split('T')[0];
        const termPart = term ? `-${term.toLowerCase()}` : '-all';
        return `allocaid-${reportType}${termPart}-${timestamp}.${format}`;
    }

    // Apply filters to data
    static applyFilters(data: any[], filters: ExportOptions['filters']): any[] {
        if (!filters) return data;
        
        let filteredData = [...data];
        
        if (filters.department) {
            filteredData = filteredData.filter(item => 
                item.department === filters.department ||
                filters.department && item.course_code?.startsWith(filters.department.toUpperCase())
            );
        }
        
        if (filters.minHours !== undefined) {
            filteredData = filteredData.filter(item => 
                (item.hours_assigned || item.total_hours || 0) >= filters.minHours!
            );
        }
        
        if (filters.maxHours !== undefined) {
            filteredData = filteredData.filter(item => 
                (item.hours_assigned || item.total_hours || 0) <= filters.maxHours!
            );
        }
        
        if (filters.status) {
            filteredData = filteredData.filter(item => 
                item.status === filters.status ||
                (filters.status === 'active' && item.utilization_rate >= 75) ||
                (filters.status === 'pending' && item.utilization_rate < 75)
            );
        }
        
        return filteredData;
    }

    // Generate JSON export
    static generateJSON(data: any[], metadata: any = {}): string {
        return JSON.stringify({
            metadata: {
                generated_at: new Date().toISOString(),
                total_records: data.length,
                ...metadata
            },
            data
        }, null, 2);
    }
}