document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const filterParty = document.getElementById('filterParty');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const generateReportBtn = document.getElementById('generateReport');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const exportPdfBtn = document.getElementById('exportPdf');
    const exportCsvBtn = document.getElementById('exportCsv');
    const reportContainer = document.getElementById('reportContainer');
    const loadingIndicator = document.getElementById('loadingReport');
    const reportTableBody = document.getElementById('reportTableBody');
    const noReportData = document.getElementById('noReportData');
    const reportActions = document.querySelector('.report-actions');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    const partyOutstandingTableBody = document.getElementById('partyOutstandingTableBody');
    
    // Display elements
    const reportParty = document.getElementById('reportParty');
    const reportDate = document.getElementById('reportDate');
    const reportPeriod = document.getElementById('reportPeriod');
    const pakkaAmount = document.getElementById('pakkaAmount');
    const kacchaAmount = document.getElementById('kacchaAmount');
    const grandTotal = document.getElementById('grandTotal');
    const summaryGrandTotal = document.getElementById('summaryGrandTotal');
    const summaryTotalPaid = document.getElementById('summaryTotalPaid');
    const summaryFinalDue = document.getElementById('summaryFinalDue');

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    startDate.value = formatDateForInput(thirtyDaysAgo);
    endDate.value = formatDateForInput(today);

    // Event Listeners
    generateReportBtn.addEventListener('click', generateReport);
    clearFiltersBtn.addEventListener('click', clearFilters);
    exportPdfBtn.addEventListener('click', exportToPdf);
    exportCsvBtn.addEventListener('click', exportToCsv);
    
    // Validate date range when dates change
    startDate.addEventListener('change', validateDateRange);
    endDate.addEventListener('change', validateDateRange);

    // Functions
    function validateDateRange() {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        
        if (start > end) {
            showNotification('Start date cannot be after end date', 'error');
            startDate.value = endDate.value;
        }
    }

    function clearFilters() {
        filterParty.value = '';
        startDate.value = formatDateForInput(thirtyDaysAgo);
        endDate.value = formatDateForInput(today);
        reportContainer.style.display = 'none';
        reportActions.style.display = 'none';
    }

    function generateReport() {
        // Show loading indicator
        loadingIndicator.style.display = 'flex';
        reportContainer.style.display = 'none';
        reportActions.style.display = 'none';
        
        // Build query parameters
        let params = new URLSearchParams();
        if (filterParty.value) params.append('party_id', filterParty.value);
        if (startDate.value) params.append('start_date', startDate.value);
        if (endDate.value) params.append('end_date', endDate.value);
        
        console.log('Generating report with params:', params.toString());
        
        // Fetch report data
        fetch(`/api/reports?${params.toString()}`)
            .then(response => {
                console.log('Report API response status:', response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        console.error('Error response text:', text);
                        throw new Error(`Network response error: ${response.status} ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Report data received:', data);
                if (!data || Object.keys(data).length === 0) {
                    throw new Error('Empty data received from server');
                }
                
                try {
                    displayReport(data);
                    loadingIndicator.style.display = 'none';
                    reportContainer.style.display = 'block';
                    reportActions.style.display = 'flex';
                } catch (displayError) {
                    console.error('Error displaying report:', displayError);
                    throw new Error(`Error displaying report: ${displayError.message}`);
                }
            })
            .catch(error => {
                console.error('Error fetching report data:', error);
                showNotification(`Failed to generate report: ${error.message}`, 'error');
                loadingIndicator.style.display = 'none';
            });
    }

    function displayReport(data) {
        // Update report meta information
        const selectedPartyOption = filterParty.options[filterParty.selectedIndex];
        reportParty.textContent = selectedPartyOption ? selectedPartyOption.text : 'All Parties';
        reportDate.textContent = formatDate(new Date());
        
        // Set period text
        const startDateFormatted = formatDate(new Date(startDate.value));
        const endDateFormatted = formatDate(new Date(endDate.value));
        reportPeriod.textContent = `${startDateFormatted} to ${endDateFormatted}`;
        
        // Clear previous data
        reportTableBody.innerHTML = '';
        expensesTableBody.innerHTML = '';
        paymentsTableBody.innerHTML = '';
        partyOutstandingTableBody.innerHTML = '';
        
        if (data.invoices.length === 0) {
            noReportData.style.display = 'block';
            reportTableBody.style.display = 'none';
            return;
        }
        
        noReportData.style.display = 'none';
        reportTableBody.style.display = 'table-row-group';
        
        // Variables for totals
        let totalPakkaAmount = 0;
        let totalKacchaAmount = 0;
        let totalAmount = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;
        
        // Track party outstanding balances
        let partyOutstandingBalances = {};
        
        // Process each invoice
        let serialNumber = 1;
        data.invoices.forEach(invoice => {
            // Add invoice to table
            const invoiceDate = new Date(invoice.date);
            
            // Add a header row for each invoice
            const invoiceHeaderRow = document.createElement('tr');
            invoiceHeaderRow.className = 'invoice-header-row';
            invoiceHeaderRow.innerHTML = `
                <td colspan="7" class="invoice-separator">
                    <strong>Invoice #${invoice.invoice_number}</strong> - ${formatDate(invoiceDate)}
                    ${invoice.vehicle_number ? ` - Vehicle: ${invoice.vehicle_number}` : ''}
                </td>
            `;
            reportTableBody.appendChild(invoiceHeaderRow);
            
            // For each line item, create a row
            if (invoice.line_items && invoice.line_items.length > 0) {
                invoice.line_items.forEach((item, index) => {
                    const lineItemRow = document.createElement('tr');
                    lineItemRow.innerHTML = `
                        <td>${serialNumber}</td>
                        <td>${formatDate(invoiceDate)}</td>
                        <td>${item.description}</td>
                        <td>${formatNumber(item.quantity)}</td>
                        <td>₹${formatNumber(item.rate)}</td>
                        <td>₹${formatNumber(item.amount)}</td>
                        <td>₹${formatNumber(item.amount)}</td>
                    `;
                    reportTableBody.appendChild(lineItemRow);
                    serialNumber++;
                });
            } else {
                // If no line items, still show the invoice
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td>${serialNumber}</td>
                    <td>${formatDate(invoiceDate)}</td>
                    <td>No items</td>
                    <td>-</td>
                    <td>-</td>
                    <td>₹${formatNumber(invoice.total_amount)}</td>
                    <td>₹${formatNumber(invoice.total_amount)}</td>
                `;
                reportTableBody.appendChild(emptyRow);
                serialNumber++;
            }
            
            // Add expenses for this invoice
            if (invoice.expenses && invoice.expenses.length > 0) {
                const expenseHeaderRow = document.createElement('tr');
                expenseHeaderRow.className = 'expense-header-row';
                expenseHeaderRow.innerHTML = `
                    <td colspan="7" class="expense-header">
                        <strong>Expenses for Invoice #${invoice.invoice_number}</strong>
                    </td>
                `;
                reportTableBody.appendChild(expenseHeaderRow);
                
                invoice.expenses.forEach(expense => {
                    const expenseRow = document.createElement('tr');
                    expenseRow.className = 'expense-row';
                    expenseRow.innerHTML = `
                        <td></td>
                        <td></td>
                        <td>${expense.expense_type}</td>
                        <td></td>
                        <td></td>
                        <td>₹${formatNumber(expense.amount)}</td>
                        <td>₹${formatNumber(expense.amount)}</td>
                    `;
                    reportTableBody.appendChild(expenseRow);
                });
            }
            
            // Add pakka/kaccha amounts for this invoice
            const pakkaKacchaRow = document.createElement('tr');
            pakkaKacchaRow.className = 'pakka-kaccha-row';
            pakkaKacchaRow.innerHTML = `
                <td colspan="4"></td>
                <td colspan="2"><strong>Pakka Amount:</strong></td>
                <td>₹${formatNumber(invoice.pakka_amount || 0)}</td>
            `;
            reportTableBody.appendChild(pakkaKacchaRow);
            
            const kacchaRow = document.createElement('tr');
            kacchaRow.className = 'pakka-kaccha-row';
            kacchaRow.innerHTML = `
                <td colspan="4"></td>
                <td colspan="2"><strong>Kaccha Amount:</strong></td>
                <td>₹${formatNumber(invoice.kaccha_amount || 0)}</td>
            `;
            reportTableBody.appendChild(kacchaRow);
            
            // Add invoice total row
            const totalRow = document.createElement('tr');
            totalRow.className = 'invoice-total-row';
            totalRow.innerHTML = `
                <td colspan="4"></td>
                <td colspan="2"><strong>Invoice Total:</strong></td>
                <td><strong>₹${formatNumber(invoice.total_amount)}</strong></td>
            `;
            reportTableBody.appendChild(totalRow);
            
            // Add a separator row
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'separator-row';
            separatorRow.innerHTML = '<td colspan="7" class="separator"></td>';
            reportTableBody.appendChild(separatorRow);
            
            // Add payment information to the payments table
            if (invoice.payments && invoice.payments.length > 0) {
                invoice.payments.forEach(payment => {
                    const paymentRow = document.createElement('tr');
                    paymentRow.innerHTML = `
                        <td>${formatDate(new Date(payment.payment_date))}</td>
                        <td>Payment for Invoice #${invoice.invoice_number}</td>
                        <td>₹${formatNumber(payment.amount)}</td>
                        <td>${payment.notes || '-'}</td>
                    `;
                    paymentsTableBody.appendChild(paymentRow);
                });
            } else if (invoice.paid_amount > 0) {
                // Fallback for old format
                const paymentRow = document.createElement('tr');
                paymentRow.innerHTML = `
                    <td>${formatDate(invoiceDate)}</td>
                    <td>Payment for Invoice #${invoice.invoice_number}</td>
                    <td>₹${formatNumber(invoice.paid_amount)}</td>
                    <td>-</td>
                `;
                paymentsTableBody.appendChild(paymentRow);
            }
            
            // Track party outstanding balance
            if (invoice.party_id && invoice.party_name) {
                if (!partyOutstandingBalances[invoice.party_id]) {
                    partyOutstandingBalances[invoice.party_id] = {
                        name: invoice.party_name,
                        outstanding: 0
                    };
                }
                partyOutstandingBalances[invoice.party_id].outstanding += invoice.outstanding_amount || 0;
            }
            
            // Update totals
            totalPakkaAmount += invoice.pakka_amount || 0;
            totalKacchaAmount += invoice.kaccha_amount || 0;
            totalAmount += invoice.total_amount || 0;
            totalPaid += invoice.paid_amount || 0;
            totalOutstanding += invoice.outstanding_amount || 0;
        });
        
        // Display party outstanding balances
        Object.keys(partyOutstandingBalances).forEach(partyId => {
            const party = partyOutstandingBalances[partyId];
            const partyRow = document.createElement('tr');
            partyRow.innerHTML = `
                <td>${party.name}</td>
                <td>₹${formatNumber(party.outstanding)}</td>
            `;
            partyOutstandingTableBody.appendChild(partyRow);
        });
        
        // Add total row to party outstanding table if multiple parties
        if (Object.keys(partyOutstandingBalances).length > 1) {
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td><strong>Total Outstanding</strong></td>
                <td><strong>₹${formatNumber(totalOutstanding)}</strong></td>
            `;
            partyOutstandingTableBody.appendChild(totalRow);
        }
        
        // Update summary amounts
        pakkaAmount.textContent = `₹${formatNumber(totalPakkaAmount)}`;
        kacchaAmount.textContent = `₹${formatNumber(totalKacchaAmount)}`;
        grandTotal.textContent = `₹${formatNumber(totalAmount)}`;
        summaryGrandTotal.textContent = `₹${formatNumber(totalAmount)}`;
        summaryTotalPaid.textContent = `₹${formatNumber(totalPaid)}`;
        summaryFinalDue.textContent = `₹${formatNumber(totalOutstanding)}`;
    }

    function exportToPdf() {
        showNotification('Preparing PDF...', 'info');
        
        try {
            // Basic check for jsPDF and html2canvas
            if (typeof jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded');
            }
            
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library not loaded');
            }
            
            // Get the report container
            const reportContainer = document.getElementById('reportContainer');
            if (!reportContainer) {
                throw new Error('Report container not found');
            }
            
            // Create a clone of the report container to avoid modifying the original
            const clone = reportContainer.cloneNode(true);
            clone.style.width = reportContainer.offsetWidth + 'px';
            
            // Set background to white for PDF
            clone.style.backgroundColor = 'white';
            
            // Temporarily append to body but hide it
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            document.body.appendChild(clone);
            
            // Use html2canvas to capture the report
            html2canvas(clone, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                try {
                    // Remove the clone
                    document.body.removeChild(clone);
                    
                    // Create PDF with A4 dimensions
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    const pdf = new jspdf.jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    // Calculate dimensions
                    const imgWidth = 210; // A4 width in mm (210mm)
                    const imgHeight = canvas.height * imgWidth / canvas.width;
                    
                    let position = 0;
                    let heightLeft = imgHeight;
                    
                    // Add first page
                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
                    heightLeft -= 297; // A4 height (297mm)
                    
                    // Add subsequent pages if needed
                    while (heightLeft > 0) {
                        position = heightLeft - imgHeight; // Top of the next slice
                        pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
                        heightLeft -= 297; // A4 height
                    }
                    
                    // Add footer to each page
                    const pageCount = pdf.internal.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(8);
                        pdf.setTextColor(100, 100, 100);
                        pdf.text(
                            `BillProZen Report - Page ${i} of ${pageCount} - Generated on ${formatDate(new Date())}`,
                            pdf.internal.pageSize.getWidth() / 2,
                            pdf.internal.pageSize.getHeight() - 5,
                            { align: 'center' }
                        );
                    }
                    
                    // Save the PDF
                    pdf.save('BillProZen_Report.pdf');
                    
                    showNotification('PDF exported successfully!', 'success');
                } catch (pdfError) {
                    console.error('Error creating PDF:', pdfError);
                    showNotification(`Failed to create PDF: ${pdfError.message}`, 'error');
                }
            }).catch(canvasError => {
                console.error('Error capturing report:', canvasError);
                showNotification(`Failed to capture report: ${canvasError.message}`, 'error');
                
                // Remove the clone if there was an error
                if (document.body.contains(clone)) {
                    document.body.removeChild(clone);
                }
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
            showNotification(`Failed to generate PDF: ${error.message}`, 'error');
        }
    }

    // Helper Functions
    function formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) return '';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    function formatDateForInput(date) {
        if (!(date instanceof Date)) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatDateForFileName(date) {
        if (!(date instanceof Date)) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
    
    function formatNumber(num) {
        if (num === undefined || num === null) return '0.00';
        return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</i>
            ${message}
        `;
        
        const notificationContainer = document.getElementById('notificationContainer');
        notificationContainer.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 300);
        }, 5000);
    }
});
