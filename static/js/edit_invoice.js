document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const invoiceForm = document.getElementById('edit-invoice-form');
    const invoiceId = document.getElementById('invoice-id').value;
    const invoiceNumber = document.getElementById('invoice-number');
    const invoiceDate = document.getElementById('invoice-date');
    const partyId = document.getElementById('party-id');
    const vehicleNumber = document.getElementById('vehicle-number');
    const lineItemsContainer = document.getElementById('line-items-container');
    const expensesContainer = document.getElementById('expenses-container');
    const lineItemsTotal = document.getElementById('line-items-total');
    const expensesTotal = document.getElementById('expenses-total');
    const totalAmount = document.getElementById('total-amount');
    const pakkaPartyId = document.getElementById('pakka-party-id');
    const pakkaAmount = document.getElementById('pakka-amount');
    const kacchaAmount = document.getElementById('kaccha-amount');
    
    // Buttons
    const addLineItemBtn = document.getElementById('add-line-item');
    const addExpenseBtn = document.getElementById('add-expense');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    // Templates
    const lineItemTemplate = document.getElementById('line-item-template');
    const expenseTemplate = document.getElementById('expense-template');
    
    // State
    let parties = [];
    let sellerParties = [];
    let currentInvoice = null;
    
    // Initialize
    fetchInvoice();
    fetchParties();
    
    // Fetch invoice data
    function fetchInvoice() {
        fetch(`/api/invoices/${invoiceId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(invoice => {
                currentInvoice = invoice;
                populateInvoiceForm(invoice);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading invoice data', 'error');
            });
    }
    
    // Fetch parties for dropdowns
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
                sellerParties = parties.filter(party => party.party_type === 'seller');
                populatePartyDropdowns();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading parties data', 'error');
            });
    }
    
    // Populate party dropdowns
    function populatePartyDropdowns() {
        // Clear existing options
        while (partyId.options.length > 1) {
            partyId.remove(1);
        }
        
        while (pakkaPartyId.options.length > 1) {
            pakkaPartyId.remove(1);
        }
        
        // Add all parties to party dropdown
        parties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.id;
            option.textContent = party.name;
            partyId.appendChild(option);
        });
        
        // Add only seller parties to pakka party dropdown
        sellerParties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.id;
            option.textContent = party.name;
            pakkaPartyId.appendChild(option);
        });
        
        // If we have the current invoice data, select the right options
        if (currentInvoice) {
            partyId.value = currentInvoice.party_id;
            if (currentInvoice.pakka_party_id) {
                pakkaPartyId.value = currentInvoice.pakka_party_id;
            }
        }
    }
    
    // Populate invoice form with data
    function populateInvoiceForm(invoice) {
        // Set basic details
        invoiceNumber.textContent = invoice.invoice_number;
        invoiceDate.value = invoice.date.split('T')[0]; // Format date for input
        vehicleNumber.value = invoice.vehicle_number || '';
        
        // Set special billing
        pakkaAmount.value = invoice.pakka_amount || 0;
        kacchaAmount.value = invoice.kaccha_amount || 0;
        
        // Clear existing line items and expenses
        lineItemsContainer.innerHTML = '';
        expensesContainer.innerHTML = '';
        
        // Add line items
        if (invoice.line_items && invoice.line_items.length > 0) {
            invoice.line_items.forEach(item => {
                addLineItem(item);
            });
        } else {
            // Add at least one empty line item
            addLineItem();
        }
        
        // Add expenses
        if (invoice.expenses && invoice.expenses.length > 0) {
            invoice.expenses.forEach(expense => {
                addExpense(expense);
            });
        }
        
        // Update totals
        updateTotals();
    }
    
    // Add a line item to the form
    function addLineItem(item = null) {
        const lineItem = document.importNode(lineItemTemplate.content, true).querySelector('.line-item');
        
        const descriptionInput = lineItem.querySelector('.item-description');
        const quantityInput = lineItem.querySelector('.item-quantity');
        const rateInput = lineItem.querySelector('.item-rate');
        const amountInput = lineItem.querySelector('.item-amount');
        const deleteBtn = lineItem.querySelector('.delete-line-item');
        
        // If we have an item, populate the fields
        if (item) {
            descriptionInput.value = item.description;
            quantityInput.value = item.quantity;
            rateInput.value = item.rate;
            amountInput.value = item.amount;
        }
        
        // Add event listeners
        quantityInput.addEventListener('input', () => {
            updateLineItemAmount(lineItem);
            updateTotals();
        });
        
        rateInput.addEventListener('input', () => {
            updateLineItemAmount(lineItem);
            updateTotals();
        });
        
        deleteBtn.addEventListener('click', () => {
            if (lineItemsContainer.children.length > 1) {
                lineItem.remove();
                updateTotals();
            } else {
                showNotification('Cannot remove the last line item', 'error');
            }
        });
        
        lineItemsContainer.appendChild(lineItem);
        
        // Calculate amount
        updateLineItemAmount(lineItem);
    }
    
    // Update a line item's amount
    function updateLineItemAmount(lineItem) {
        const quantity = parseFloat(lineItem.querySelector('.item-quantity').value) || 0;
        const rate = parseFloat(lineItem.querySelector('.item-rate').value) || 0;
        const amount = quantity * rate;
        
        lineItem.querySelector('.item-amount').value = amount.toFixed(2);
    }
    
    // Add an expense to the form
    function addExpense(expense = null) {
        const expenseEl = document.importNode(expenseTemplate.content, true).querySelector('.expense');
        
        const typeInput = expenseEl.querySelector('.expense-type');
        const amountInput = expenseEl.querySelector('.expense-amount');
        const deleteBtn = expenseEl.querySelector('.delete-expense');
        
        // If we have an expense, populate the fields
        if (expense) {
            typeInput.value = expense.expense_type;
            amountInput.value = expense.amount;
        }
        
        // Add event listeners
        amountInput.addEventListener('input', updateTotals);
        
        deleteBtn.addEventListener('click', () => {
            expenseEl.remove();
            updateTotals();
        });
        
        expensesContainer.appendChild(expenseEl);
    }
    
    // Update totals
    function updateTotals() {
        // Calculate line items total
        let lineItemsSum = 0;
        document.querySelectorAll('.item-amount').forEach(input => {
            lineItemsSum += parseFloat(input.value) || 0;
        });
        
        // Calculate expenses total
        let expensesSum = 0;
        document.querySelectorAll('.expense-amount').forEach(input => {
            expensesSum += parseFloat(input.value) || 0;
        });
        
        // Update displayed totals
        lineItemsTotal.textContent = formatAmount(lineItemsSum);
        expensesTotal.textContent = formatAmount(expensesSum);
        
        // Calculate and update total amount
        const total = lineItemsSum + expensesSum;
        totalAmount.textContent = formatAmount(total);
    }
    
    // Format amount with Indian Rupee symbol
    function formatAmount(amount) {
        return `₹${parseFloat(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
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
    
    // Validate form before submission
    function validateForm() {
        // Check if party is selected
        if (!partyId.value) {
            showNotification('Please select a party', 'error');
            return false;
        }
        
        // Check if date is selected
        if (!invoiceDate.value) {
            showNotification('Please select a date', 'error');
            return false;
        }
        
        // Check if pakka party is a seller
        if (pakkaPartyId.value && !sellerParties.some(party => party.id == pakkaPartyId.value)) {
            showNotification('Pakka party must be a seller', 'error');
            return false;
        }
        
        // Check if pakka amount is provided when pakka party is selected
        if (pakkaPartyId.value && (!pakkaAmount.value || parseFloat(pakkaAmount.value) <= 0)) {
            showNotification('Please enter a pakka amount', 'error');
            return false;
        }
        
        // Check if pakka party is selected when pakka amount is provided
        if (parseFloat(pakkaAmount.value) > 0 && !pakkaPartyId.value) {
            showNotification('Please select a pakka party', 'error');
            return false;
        }
        
        return true;
    }
    
    // Collect form data for submission
    function collectFormData() {
        // Collect line items
        const lineItems = [];
        document.querySelectorAll('.line-item').forEach(item => {
            lineItems.push({
                description: item.querySelector('.item-description').value,
                quantity: parseFloat(item.querySelector('.item-quantity').value),
                rate: parseFloat(item.querySelector('.item-rate').value),
                amount: parseFloat(item.querySelector('.item-amount').value)
            });
        });
        
        // Collect expenses
        const expenses = [];
        document.querySelectorAll('.expense').forEach(expense => {
            expenses.push({
                expense_type: expense.querySelector('.expense-type').value,
                amount: parseFloat(expense.querySelector('.expense-amount').value)
            });
        });
        
        // Build invoice data
        return {
            date: invoiceDate.value,
            party_id: parseInt(partyId.value),
            vehicle_number: vehicleNumber.value,
            pakka_party_id: pakkaPartyId.value ? parseInt(pakkaPartyId.value) : null,
            pakka_amount: parseFloat(pakkaAmount.value) || 0,
            kaccha_amount: parseFloat(kacchaAmount.value) || 0,
            line_items: lineItems,
            expenses: expenses
        };
    }
    
    // Event Listeners
    addLineItemBtn.addEventListener('click', () => {
        addLineItem();
        updateTotals();
    });
    
    addExpenseBtn.addEventListener('click', () => {
        addExpense();
        updateTotals();
    });
    
    cancelEditBtn.addEventListener('click', () => {
        window.location.href = '/invoices';
    });
    
    // Handle pakka party and amount validation
    pakkaPartyId.addEventListener('change', function() {
        if (this.value && (!pakkaAmount.value || parseFloat(pakkaAmount.value) <= 0)) {
            pakkaAmount.focus();
        }
    });
    
    pakkaAmount.addEventListener('input', function() {
        if (parseFloat(this.value) > 0 && !pakkaPartyId.value) {
            showNotification('Please select a pakka party', 'error');
            pakkaPartyId.focus();
        }
    });
    
    // Form submission
    invoiceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const invoiceData = collectFormData();
        
        // Send the data to the server
        fetch(`/api/invoices/${invoiceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message || 'Failed to update invoice');
                    });
                }
                return response.json();
            })
            .then(data => {
                showNotification('Invoice updated successfully', 'success');
                
                // Redirect to invoices list after a short delay
                setTimeout(() => {
                    window.location.href = '/invoices';
                }, 1500);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification(error.message, 'error');
            });
    });
});
