document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const invoicesTable = document.getElementById('invoices-table');
    const invoicesList = document.getElementById('invoices-list');
    const noInvoices = document.getElementById('no-invoices');
    const invoiceSearch = document.getElementById('invoice-search');
    const partyFilter = document.getElementById('party-filter');
    const dateFilter = document.getElementById('date-filter');
    
    // Modals
    const invoiceModal = document.getElementById('invoice-modal');
    const closeModal = document.getElementById('close-modal');
    const invoiceDetails = document.getElementById('invoice-details');
    const printInvoice = document.getElementById('print-invoice');
    const editInvoice = document.getElementById('edit-invoice');
    const deleteInvoice = document.getElementById('delete-invoice');
    
    // Confirm Modal
    const confirmModal = document.getElementById('confirm-modal');
    const closeConfirm = document.getElementById('close-confirm');
    const cancelDelete = document.getElementById('cancel-delete');
    const confirmDelete = document.getElementById('confirm-delete');
    
    // State
    let invoices = [];
    let selectedInvoiceId = null;
    let parties = [];
    
    // Fetch all invoices
    function fetchInvoices() {
        fetch('/api/invoices')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                invoices = data;
                renderInvoices(invoices);
                updatePartyFilter();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading invoices', 'error');
            });
    }
    
    // Fetch all parties for filters
    function fetchParties() {
        fetch('/api/parties')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                parties = data;
                updatePartyFilter();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading parties', 'error');
            });
    }
    
    // Update party filter dropdown
    function updatePartyFilter() {
        // Clear existing options except the first one
        while (partyFilter.options.length > 1) {
            partyFilter.remove(1);
        }
        
        // Add parties from the fetched data
        parties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.id;
            option.textContent = party.name;
            partyFilter.appendChild(option);
        });
    }
    
    // Render invoices to the table
    function renderInvoices(invoicesToRender) {
        // Clear existing rows
        invoicesList.innerHTML = '';
        
        if (invoicesToRender.length === 0) {
            invoicesTable.style.display = 'none';
            noInvoices.style.display = 'flex';
            return;
        }
        
        invoicesTable.style.display = 'table';
        noInvoices.style.display = 'none';
        
        // Add invoice rows
        invoicesToRender.forEach(invoice => {
            const row = document.createElement('tr');
            row.dataset.id = invoice.id;
            
            // Format date
            const date = new Date(invoice.date);
            const formattedDate = date.toLocaleDateString('en-IN');
            
            // Format amounts with Indian Rupee symbol
            const formatAmount = amount => {
                return `₹${parseFloat(amount).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
            };
            
            row.innerHTML = `
                <td>${invoice.invoice_number}</td>
                <td>${formattedDate}</td>
                <td>${invoice.party_name}</td>
                <td>${invoice.vehicle_number || '-'}</td>
                <td>${formatAmount(invoice.total_amount)}</td>
                <td>${invoice.pakka_amount > 0 ? formatAmount(invoice.pakka_amount) : '-'}</td>
                <td>${invoice.kaccha_amount > 0 ? formatAmount(invoice.kaccha_amount) : '-'}</td>
                <td class="actions">
                    <button class="btn-icon view-invoice" title="View Invoice">
                        <i class="material-icons">visibility</i>
                    </button>
                    <button class="btn-icon edit-invoice" title="Edit Invoice">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-icon delete-invoice" title="Delete Invoice">
                        <i class="material-icons">delete</i>
                    </button>
                </td>
            `;
            
            invoicesList.appendChild(row);
        });
        
        // Add event listeners to action buttons
        addActionListeners();
    }
    
    // Add event listeners to invoice action buttons
    function addActionListeners() {
        // View invoice
        document.querySelectorAll('.view-invoice').forEach(button => {
            button.addEventListener('click', function(e) {
                const row = e.target.closest('tr');
                selectedInvoiceId = row.dataset.id;
                viewInvoice(selectedInvoiceId);
            });
        });
        
        // Edit invoice
        document.querySelectorAll('.edit-invoice').forEach(button => {
            button.addEventListener('click', function(e) {
                const row = e.target.closest('tr');
                const invoiceId = row.dataset.id;
                window.location.href = `/invoices/edit/${invoiceId}`;
            });
        });
        
        // Delete invoice
        document.querySelectorAll('.delete-invoice').forEach(button => {
            button.addEventListener('click', function(e) {
                const row = e.target.closest('tr');
                selectedInvoiceId = row.dataset.id;
                openConfirmModal();
            });
        });
    }
    
    // View invoice details
    function viewInvoice(invoiceId) {
        fetch(`/api/invoices/${invoiceId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(invoice => {
                renderInvoiceDetails(invoice);
                openInvoiceModal();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading invoice details', 'error');
            });
    }
    
    // Render invoice details in the modal
    function renderInvoiceDetails(invoice) {
        // Format date
        const date = new Date(invoice.date);
        const formattedDate = date.toLocaleDateString('en-IN');
        
        // Format amounts with Indian Rupee symbol
        const formatAmount = amount => {
            return `₹${parseFloat(amount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        };
        
        // Generate line items HTML
        let lineItemsHtml = '';
        if (invoice.line_items && invoice.line_items.length > 0) {
            lineItemsHtml = `
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Rate</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.line_items.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td>${item.quantity}</td>
                                <td>${formatAmount(item.rate)}</td>
                                <td>${formatAmount(item.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            lineItemsHtml = '<p>No line items</p>';
        }
        
        // Generate expenses HTML
        let expensesHtml = '';
        if (invoice.expenses && invoice.expenses.length > 0) {
            expensesHtml = `
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Expense Type</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.expenses.map(expense => `
                            <tr>
                                <td>${expense.expense_type}</td>
                                <td>${formatAmount(expense.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            expensesHtml = '<p>No expenses</p>';
        }
        
        // Generate special billing HTML
        let specialBillingHtml = '';
        if (invoice.pakka_amount > 0 || invoice.kaccha_amount > 0) {
            specialBillingHtml = `
                <div class="special-billing">
                    ${invoice.pakka_amount > 0 ? `
                        <div class="billing-item">
                            <h4>Pakka Amount</h4>
                            <p><strong>Party:</strong> ${invoice.pakka_party_name || 'N/A'}</p>
                            <p><strong>Amount:</strong> ${formatAmount(invoice.pakka_amount)}</p>
                        </div>
                    ` : ''}
                    
                    ${invoice.kaccha_amount > 0 ? `
                        <div class="billing-item">
                            <h4>Kaccha Amount</h4>
                            <p><strong>Amount:</strong> ${formatAmount(invoice.kaccha_amount)}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Render the complete invoice details
        invoiceDetails.innerHTML = `
            <div class="invoice-header">
                <h3>Invoice #${invoice.invoice_number}</h3>
                <p><strong>Date:</strong> ${formattedDate}</p>
            </div>
            
            <div class="invoice-party">
                <h3>Party Information</h3>
                <p><strong>Name:</strong> ${invoice.party_name}</p>
                <p><strong>Vehicle Number:</strong> ${invoice.vehicle_number || 'N/A'}</p>
            </div>
            
            <div class="invoice-items">
                <h3>Line Items</h3>
                ${lineItemsHtml}
            </div>
            
            <div class="invoice-expenses">
                <h3>Expenses</h3>
                ${expensesHtml}
            </div>
            
            ${specialBillingHtml}
            
            <div class="invoice-total">
                <h3>Total Amount: ${formatAmount(invoice.total_amount)}</h3>
            </div>
        `;
    }
    
    // Open invoice details modal
    function openInvoiceModal() {
        invoiceModal.style.display = 'flex';
    }
    
    // Close invoice details modal
    function closeInvoiceModal() {
        invoiceModal.style.display = 'none';
    }
    
    // Open confirm delete modal
    function openConfirmModal() {
        confirmModal.style.display = 'flex';
    }
    
    // Close confirm delete modal
    function closeConfirmModal() {
        confirmModal.style.display = 'none';
    }
    
    // Delete invoice
    function deleteInvoiceById(invoiceId) {
        fetch(`/api/invoices/${invoiceId}`, {
            method: 'DELETE'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                showNotification('Invoice deleted successfully', 'success');
                fetchInvoices(); // Refresh the list
                closeConfirmModal();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error deleting invoice', 'error');
            });
    }
    
    // Filter invoices
    function filterInvoices() {
        const searchTerm = invoiceSearch.value.toLowerCase();
        const selectedParty = partyFilter.value;
        const selectedDate = dateFilter.value;
        
        let filtered = invoices;
        
        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(invoice => 
                invoice.invoice_number.toLowerCase().includes(searchTerm) ||
                invoice.party_name.toLowerCase().includes(searchTerm) ||
                (invoice.vehicle_number && invoice.vehicle_number.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filter by party
        if (selectedParty) {
            filtered = filtered.filter(invoice => invoice.party_id == selectedParty);
        }
        
        // Filter by date
        if (selectedDate) {
            const today = new Date();
            const invoiceDate = new Date(invoice.date);
            
            switch (selectedDate) {
                case 'today':
                    filtered = filtered.filter(invoice => {
                        const date = new Date(invoice.date);
                        return date.toDateString() === today.toDateString();
                    });
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    filtered = filtered.filter(invoice => {
                        const date = new Date(invoice.date);
                        return date >= weekAgo && date <= today;
                    });
                    break;
                case 'month':
                    filtered = filtered.filter(invoice => {
                        const date = new Date(invoice.date);
                        return date.getMonth() === today.getMonth() && 
                               date.getFullYear() === today.getFullYear();
                    });
                    break;
                case 'year':
                    filtered = filtered.filter(invoice => {
                        const date = new Date(invoice.date);
                        return date.getFullYear() === today.getFullYear();
                    });
                    break;
            }
        }
        
        renderInvoices(filtered);
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="material-icons">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</i>
                <span>${message}</span>
            </div>
            <button class="close-notification">
                <i class="material-icons">close</i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Add event listener to close button
        notification.querySelector('.close-notification').addEventListener('click', function() {
            notification.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Event Listeners
    closeModal.addEventListener('click', closeInvoiceModal);
    closeConfirm.addEventListener('click', closeConfirmModal);
    cancelDelete.addEventListener('click', closeConfirmModal);
    
    // Generate Invoice button
    document.getElementById('generate-invoice').addEventListener('click', function() {
        if (selectedInvoiceId) {
            // Open the generate invoice page in a new tab
            window.open(`/api/invoices/${selectedInvoiceId}/generate`, '_blank');
        }
    });
    
    // Print Invoice button
    printInvoice.addEventListener('click', function() {
        if (selectedInvoiceId) {
            // Use the browser's print functionality to print the modal content
            const printContents = invoiceDetails.innerHTML;
            const originalContents = document.body.innerHTML;
            
            document.body.innerHTML = `
                <div class="print-container" style="padding: 20px;">
                    <h1 style="text-align: center;">Invoice #${selectedInvoiceId}</h1>
                    ${printContents}
                </div>
            `;
            
            window.print();
            document.body.innerHTML = originalContents;
            
            // Re-attach event listeners after restoring the original content
            addActionListeners();
        }
    });
    
    confirmDelete.addEventListener('click', function() {
        if (selectedInvoiceId) {
            deleteInvoiceById(selectedInvoiceId);
        }
    });
    
    editInvoice.addEventListener('click', function() {
        if (selectedInvoiceId) {
            window.location.href = `/invoices/edit/${selectedInvoiceId}`;
        }
    });
    
    // Search and filter event listeners
    invoiceSearch.addEventListener('input', filterInvoices);
    partyFilter.addEventListener('change', filterInvoices);
    dateFilter.addEventListener('change', filterInvoices);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === invoiceModal) {
            closeInvoiceModal();
        }
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
    
    // Initialize
    fetchInvoices();
    fetchParties();
});
