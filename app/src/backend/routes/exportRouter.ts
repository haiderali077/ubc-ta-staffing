import { Router, Context } from '../../../deps.ts';
import { requireRole } from '../middleware/auth.ts';
import { AuthService } from '../services/auth.ts';
import { ExportModel } from '../../database/models/export.ts';
import { ExportUtils } from '../utils/exportUtils.ts';

let exportModel: ExportModel;
let authService: AuthService;

export function setExportDependencies(model: ExportModel, auth: AuthService) {
    exportModel = model;
    authService = auth;
}

export const exportRouter = new Router();

// Get analytics data (UR2.11 - view analytics)
exportRouter.get('/analytics', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const term = url.searchParams.get('term') || undefined;
            
            const analytics = await exportModel.getAnalytics(term);
            
            ctx.response.status = 200;
            ctx.response.body = { 
                success: true, 
                data: analytics,
                term: term || 'All Terms'
            };
        } catch (error) {
            console.error('Error fetching analytics:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to fetch analytics data' 
            };
        }
    });
});

// Get available terms for filtering
exportRouter.get('/terms', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const terms = await exportModel.getAvailableTerms();
            
            ctx.response.status = 200;
            ctx.response.body = { 
                success: true, 
                data: terms 
            };
        } catch (error) {
            console.error('Error fetching terms:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to fetch terms' 
            };
        }
    });
});

// Export course allocations report
exportRouter.get('/course-allocations', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get('format') as 'csv' | 'pdf' || 'csv';
            const term = url.searchParams.get('term') || undefined;
            
            // Validate format
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Invalid format. Must be csv or pdf' 
                };
                return;
            }
            
            const data = await exportModel.getCourseAllocationReportData(term);
            const title = ExportUtils.getReportTitle('course-allocations', term);
            const filename = ExportUtils.getFilename('course-allocations', format, term);
            
            if (format === 'csv') {
                const csvContent = ExportUtils.generateCourseAllocationCSV(data);
                
                ctx.response.headers.set('Content-Type', 'text/csv');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, 'course-allocations');
                
                ctx.response.headers.set('Content-Type', 'text/html');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating course allocations report:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to generate course allocations report' 
            };
        }
    });
});

// Export student assignments report
exportRouter.get('/student-assignments', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get('format') as 'csv' | 'pdf' || 'csv';
            const term = url.searchParams.get('term') || undefined;
            
            // Validate format
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Invalid format. Must be csv or pdf' 
                };
                return;
            }
            
            const data = await exportModel.getStudentAssignmentReportData(term);
            const title = ExportUtils.getReportTitle('student-assignments', term);
            const filename = ExportUtils.getFilename('student-assignments', format, term);
            
            if (format === 'csv') {
                const csvContent = ExportUtils.generateStudentAssignmentCSV(data);
                
                ctx.response.headers.set('Content-Type', 'text/csv');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, 'student-assignments');
                
                ctx.response.headers.set('Content-Type', 'text/html');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating student assignments report:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to generate student assignments report' 
            };
        }
    });
});

// Export hours comparison report
exportRouter.get('/hours-comparison', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const url = new URL(ctx.request.url);
            const format = url.searchParams.get('format') as 'csv' | 'pdf' || 'csv';
            const term = url.searchParams.get('term') || undefined;
            
            // Validate format
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Invalid format. Must be csv or pdf' 
                };
                return;
            }
            
            const data = await exportModel.getHoursComparisonReportData(term);
            const title = ExportUtils.getReportTitle('hours-comparison', term);
            const filename = ExportUtils.getFilename('hours-comparison', format, term);
            
            if (format === 'csv') {
                const csvContent = ExportUtils.generateHoursComparisonCSV(data);
                
                ctx.response.headers.set('Content-Type', 'text/csv');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, 'hours-comparison');
                
                ctx.response.headers.set('Content-Type', 'text/html');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating hours comparison report:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to generate hours comparison report' 
            };
        }
    });
});

// Combined export endpoint for multiple formats
exportRouter.post('/generate', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            const requestBody = await ctx.request.body({ type: 'json' }).value;
            const { reportType, format, term, options } = requestBody;
            
            // Validate input
            if (!reportType || !format) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Report type and format are required' 
                };
                return;
            }
            
            if (!['course-allocations', 'student-assignments', 'hours-comparison'].includes(reportType)) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Invalid report type' 
                };
                return;
            }
            
            if (!['csv', 'pdf'].includes(format)) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Invalid format. Must be csv or pdf' 
                };
                return;
            }
            
            // Get data based on report type
            let data: any[];
            switch (reportType) {
                case 'course-allocations':
                    data = await exportModel.getCourseAllocationReportData(term);
                    break;
                case 'student-assignments':
                    data = await exportModel.getStudentAssignmentReportData(term);
                    break;
                case 'hours-comparison':
                    data = await exportModel.getHoursComparisonReportData(term);
                    break;
                default:
                    throw new Error('Invalid report type');
            }
            
            const title = ExportUtils.getReportTitle(reportType, term);
            const filename = ExportUtils.getFilename(reportType, format, term);
            
            if (format === 'csv') {
                let csvContent: string;
                switch (reportType) {
                    case 'course-allocations':
                        csvContent = ExportUtils.generateCourseAllocationCSV(data);
                        break;
                    case 'student-assignments':
                        csvContent = ExportUtils.generateStudentAssignmentCSV(data);
                        break;
                    case 'hours-comparison':
                        csvContent = ExportUtils.generateHoursComparisonCSV(data);
                        break;
                    default:
                        throw new Error('Invalid report type');
                }
                
                ctx.response.headers.set('Content-Type', 'text/csv');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                ctx.response.body = csvContent;
            } else {
                const htmlContent = ExportUtils.generatePDFHTML(data, title, reportType);
                
                ctx.response.headers.set('Content-Type', 'text/html');
                ctx.response.headers.set('Content-Disposition', `attachment; filename="${filename.replace('.pdf', '.html')}"`);
                ctx.response.body = htmlContent;
            }
        } catch (error) {
            console.error('Error generating report:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to generate report' 
            };
        }
    });
});

// Preview report data (for frontend to display before export)
exportRouter.get('/preview/:reportType', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            // Extract reportType from the URL path
            const reportType = ctx.request.url.pathname.split('/').pop();
            const url = new URL(ctx.request.url);
            const term = url.searchParams.get('term') || undefined;
            const limit = parseInt(url.searchParams.get('limit') || '10');
            
            if (!['course-allocations', 'student-assignments', 'hours-comparison'].includes(reportType!)) {
                ctx.response.status = 400;
                ctx.response.body = { 
                    success: false, 
                    error: 'Invalid report type' 
                };
                return;
            }
            
            // Get data based on report type
            let data: any[];
            switch (reportType) {
                case 'course-allocations':
                    data = await exportModel.getCourseAllocationReportData(term);
                    break;
                case 'student-assignments':
                    data = await exportModel.getStudentAssignmentReportData(term);
                    break;
                case 'hours-comparison':
                    data = await exportModel.getHoursComparisonReportData(term);
                    break;
                default:
                    throw new Error('Invalid report type');
            }
            
            // Limit results for preview
            const previewData = data.slice(0, limit);
            
            ctx.response.status = 200;
            ctx.response.body = { 
                success: true, 
                data: previewData,
                total: data.length,
                preview: true,
                term: term || 'All Terms'
            };
        } catch (error) {
            console.error('Error generating preview:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                error: 'Failed to generate preview' 
            };
        }
    });
});

// Health check endpoint for export functionality
exportRouter.get('/health', async (ctx: Context) => {
    await requireRole(authService, 'ta_coordinator')(ctx, async () => {
        try {
            // Test basic database connectivity
            const terms = await exportModel.getAvailableTerms();
            
            ctx.response.status = 200;
            ctx.response.body = { 
                success: true, 
                status: 'healthy',
                message: 'Export service is operational',
                availableTerms: terms.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Export service health check failed:', error);
            ctx.response.status = 500;
            ctx.response.body = { 
                success: false, 
                status: 'unhealthy',
                error: 'Export service is not operational' 
            };
        }
    });
});