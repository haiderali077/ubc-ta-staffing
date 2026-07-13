/**
 * PDF Service for converting HTML to PDF
 * Uses Puppeteer-like approach with headless Chrome
 * For production, consider using:
 * - Puppeteer: https://pptr.dev/
 * - wkhtmltopdf: https://wkhtmltopdf.org/
 * - jsPDF: https://github.com/parallax/jsPDF
 */

export interface PDFOptions {
    format?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
}

export class PDFService {
    private static defaultOptions: PDFOptions = {
        format: 'A4',
        orientation: 'portrait',
        margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size: 9px; margin: 0 auto;">AllocAid TA Management System</div>',
        footerTemplate: '<div style="font-size: 9px; margin: 0 auto;"><span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    };

    /**
     * Convert HTML to PDF (placeholder implementation)
     * In production, this would use a proper PDF generation library
     */
    static async generatePDF(html: string, options: PDFOptions = {}): Promise<Uint8Array> {
        const finalOptions = { ...this.defaultOptions, ...options };
        
        try {
            // For now, return the HTML as bytes for the client to handle
            // In production, you would use a proper PDF generation service
            
            // This is a placeholder implementation
            // In a real application, you would use:
            // 1. Puppeteer with headless Chrome
            // 2. wkhtmltopdf command line tool
            // 3. A cloud PDF service
            // 4. jsPDF for client-side generation
            
            const encoder = new TextEncoder();
            return encoder.encode(html);
            
        } catch (error) {
            console.error('PDF generation failed:', error);
            throw new Error('Failed to generate PDF');
        }
    }

    /**
     * Generate PDF with Puppeteer (example implementation)
     * Requires: npm install puppeteer
     */
    static async generatePDFWithPuppeteer(html: string, options: PDFOptions = {}): Promise<Uint8Array> {
        // This is commented out as it requires external dependencies
        // Uncomment and install puppeteer if you want to use this approach
        
        /*
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        await page.setContent(html);
        
        const pdf = await page.pdf({
            format: options.format || 'A4',
            landscape: options.orientation === 'landscape',
            margin: options.margin || {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            },
            displayHeaderFooter: options.displayHeaderFooter || false,
            headerTemplate: options.headerTemplate || '',
            footerTemplate: options.footerTemplate || ''
        });
        
        await browser.close();
        return pdf;
        */
        
        throw new Error('Puppeteer PDF generation not implemented. Install puppeteer dependency.');
    }

    /**
     * Generate PDF using wkhtmltopdf (example implementation)
     * Requires: wkhtmltopdf installed on system
     */
    static async generatePDFWithWkhtmltopdf(html: string, options: PDFOptions = {}): Promise<Uint8Array> {
        // This is commented out as it requires external system dependencies
        // Uncomment if you have wkhtmltopdf installed
        
        /*
        const tempHtmlFile = await Deno.makeTempFile({ suffix: '.html' });
        const tempPdfFile = await Deno.makeTempFile({ suffix: '.pdf' });
        
        try {
            // Write HTML to temp file
            await Deno.writeTextFile(tempHtmlFile, html);
            
            // Run wkhtmltopdf command
            const cmd = [
                'wkhtmltopdf',
                '--page-size', options.format || 'A4',
                '--orientation', options.orientation || 'Portrait',
                '--margin-top', options.margin?.top || '1cm',
                '--margin-right', options.margin?.right || '1cm',
                '--margin-bottom', options.margin?.bottom || '1cm',
                '--margin-left', options.margin?.left || '1cm',
                tempHtmlFile,
                tempPdfFile
            ];
            
            const process = Deno.run({
                cmd,
                stdout: 'piped',
                stderr: 'piped'
            });
            
            const status = await process.status();
            
            if (!status.success) {
                throw new Error('wkhtmltopdf failed');
            }
            
            const pdfContent = await Deno.readFile(tempPdfFile);
            return pdfContent;
            
        } finally {
            // Clean up temp files
            try {
                await Deno.remove(tempHtmlFile);
                await Deno.remove(tempPdfFile);
            } catch (e) {
                console.warn('Failed to clean up temp files:', e);
            }
        }
        */
        
        throw new Error('wkhtmltopdf PDF generation not implemented. Install wkhtmltopdf system dependency.');
    }

    /**
     * Enhanced HTML template with better CSS for PDF
     */
    static enhanceHTMLForPDF(html: string): string {
        // Add CSS optimizations for PDF generation
        const pdfStyles = `
            <style>
                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    .no-break {
                        page-break-inside: avoid;
                    }
                }
                
                table {
                    font-size: 11px;
                }
                
                th {
                    background-color: #f0f0f0 !important;
                    color: #333 !important;
                }
                
                .long-text {
                    word-wrap: break-word;
                    max-width: 200px;
                }
            </style>
        `;
        
        // Insert enhanced styles after the existing style tag
        return html.replace('</style>', pdfStyles + '</style>');
    }
}