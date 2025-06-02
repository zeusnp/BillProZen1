document.addEventListener('DOMContentLoaded', function() {
    const invoiceForm = document.getElementById('invoiceForm');
    const lineItemsTable = document.getElementById('lineItemsTable');
    const expensesTable = document.getElementById('expensesTable');
    const addLineItemBtn = document.getElementById('addLineItem');
    const addExpenseBtn = document.getElementById('addExpense');
    const pakkaPartySelect = document.getElementById('pakkaParty');

    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
    
    // Fetch seller parties for pakka party dropdown
    fetchSellerParties();
    
    // Add at least one line item and expense row by default
    addLineItemBtn.click();
    addExpenseBtn.click();

    // Fetch seller parties from API
    function fetchSellerParties() {
        fetch('/api/parties/sellers')
            .then(response => response.json())
            .then(sellers => {
                // Clear existing options except the first one
                while (pakkaPartySelect.options.length > 1) {
                    pakkaPartySelect.remove(1);
                }
                
                // Add seller parties to dropdown
                sellers.forEach(seller => {
                    const option = document.createElement('option');
                    option.value = seller.id;
                    option.textContent = seller.name;
                    pakkaPartySelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching seller parties:', error);
                showNotification('Failed to load seller parties', 'error');
            });
    }

    // Add new line item
    addLineItemBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" name="description[]" required></td>
            <td><input type="number" name="quantity[]" value="1" min="1" required></td>
            <td><input type="number" name="rate[]" value="0" min="0" required></td>
            <td><span class="amount">0</span></td>
            <td><button type="button" class="btn-icon delete-row"><i class="material-icons">delete</i></button></td>
        `;
        lineItemsTable.querySelector('tbody').appendChild(newRow);
        setupRowListeners(newRow);
    });

    // Add new expense
    addExpenseBtn.addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" name="expenseType[]" required></td>
            <td><input type="number" name="expenseAmount[]" value="0" min="0" required></td>
            <td><button type="button" class="btn-icon delete-row"><i class="material-icons">delete</i></button></td>
        `;
        expensesTable.querySelector('tbody').appendChild(newRow);
        setupExpenseListeners(newRow);
    });

    // Delete row functionality
    function setupDeleteButton(row) {
        const deleteBtn = row.querySelector('.delete-row');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                row.remove();
                calculateTotal();
            });
        }
    }

    // Calculate line item amount
    function calculateLineItemAmount(row) {
        const quantity = parseFloat(row.querySelector('input[name="quantity[]"]').value) || 0;
        const rate = parseFloat(row.querySelector('input[name="rate[]"]').value) || 0;
        const amount = quantity * rate;
        row.querySelector('.amount').textContent = amount.toFixed(2);
        return amount;
    }

    // Setup line item row listeners
    function setupRowListeners(row) {
        const quantityInput = row.querySelector('input[name="quantity[]"]');
        const rateInput = row.querySelector('input[name="rate[]"]');
        
        [quantityInput, rateInput].forEach(input => {
            input.addEventListener('input', function() {
                calculateLineItemAmount(row);
                calculateTotal();
            });
        });

        setupDeleteButton(row);
    }

    // Setup expense row listeners
    function setupExpenseListeners(row) {
        const amountInput = row.querySelector('input[name="expenseAmount[]"]');
        amountInput.addEventListener('input', calculateTotal);
        setupDeleteButton(row);
    }

    // Calculate total amount
    function calculateTotal() {
        let lineItemsTotal = 0;
        let expensesTotal = 0;

        // Sum line items
        lineItemsTable.querySelectorAll('tbody tr').forEach(row => {
            lineItemsTotal += parseFloat(row.querySelector('.amount').textContent) || 0;
        });

        // Sum expenses
        expensesTable.querySelectorAll('input[name="expenseAmount[]"]').forEach(input => {
            expensesTotal += parseFloat(input.value) || 0;
        });

        // Calculate total without pakka and kaccha
        const totalBeforePakkaKaccha = lineItemsTotal + expensesTotal;
        
        // Update pakka and kaccha amounts based on total
        const pakkaAmount = parseFloat(document.getElementById('pakkaAmount').value) || 0;
        const kacchaAmount = parseFloat(document.getElementById('kacchaAmount').value) || 0;
        
        // Update total display
        document.getElementById('totalAmount').textContent = '₹' + totalBeforePakkaKaccha.toFixed(2);
        
        // Update hidden total amount field
        if (document.getElementById('totalAmountHidden')) {
            document.getElementById('totalAmountHidden').value = totalBeforePakkaKaccha;
        }
        
        // Validate pakka + kaccha = total
        validatePakkaKacchaTotal(pakkaAmount, kacchaAmount, totalBeforePakkaKaccha);
        
        return totalBeforePakkaKaccha;
    }
    
    // Validate that pakka + kaccha = total
    function validatePakkaKacchaTotal(pakka, kaccha, total) {
        const pakkaKacchaSum = pakka + kaccha;
        const errorElement = document.getElementById('pakka-kaccha-error');
        
        if (!errorElement) {
            // Create error element if it doesn't exist
            const errorDiv = document.createElement('div');
            errorDiv.id = 'pakka-kaccha-error';
            errorDiv.className = 'error-message';
            document.querySelector('.total-section').appendChild(errorDiv);
        }
        
        if (Math.abs(pakkaKacchaSum - total) > 0.01 && (pakka > 0 || kaccha > 0)) {
            document.getElementById('pakka-kaccha-error').textContent = 
                `Error: Pakka (₹${pakka}) + Kaccha (₹${kaccha}) = ₹${pakkaKacchaSum.toFixed(2)} must equal Total (₹${total.toFixed(2)})`;
            document.getElementById('pakka-kaccha-error').style.display = 'block';
            return false;
        } else {
            document.getElementById('pakka-kaccha-error').textContent = '';
            document.getElementById('pakka-kaccha-error').style.display = 'none';
            return true;
        }
    }

    // Add auto-calculation for kaccha amount
    document.getElementById('pakkaAmount').addEventListener('input', function() {
        const total = calculateTotal();
        const pakkaAmount = parseFloat(this.value) || 0;
        const kacchaField = document.getElementById('kacchaAmount');
        
        // Auto-calculate kaccha amount
        kacchaField.value = (total - pakkaAmount).toFixed(2);
        
        // Recalculate total to update validation
        calculateTotal();
    });
    
    // Add auto-calculation for pakka amount
    document.getElementById('kacchaAmount').addEventListener('input', function() {
        const total = calculateTotal();
        const kacchaAmount = parseFloat(this.value) || 0;
        const pakkaField = document.getElementById('pakkaAmount');
        const pakkaPartySelected = document.getElementById('pakkaParty').value;
        
        // Only auto-calculate pakka if a pakka party is selected
        if (pakkaPartySelected) {
            pakkaField.value = (total - kacchaAmount).toFixed(2);
        }
        
        // Recalculate total to update validation
        calculateTotal();
    });
    
    // Add validation for pakka party selection
    document.getElementById('pakkaParty').addEventListener('change', function() {
        const pakkaAmountField = document.getElementById('pakkaAmount');
        const total = calculateTotal();
        const kacchaAmount = parseFloat(document.getElementById('kacchaAmount').value) || 0;
        
        if (this.value) {
            // If pakka party is selected, enable pakka amount field
            pakkaAmountField.disabled = false;
            
            // Set default pakka amount if it's empty
            if (!pakkaAmountField.value || parseFloat(pakkaAmountField.value) === 0) {
                pakkaAmountField.value = (total - kacchaAmount).toFixed(2);
                calculateTotal(); // Recalculate to update validation
            }
            
            // Show a notification about the pakka party relationship
            showNotification('The selected seller party will receive the pakka amount from the buyer', 'info', 5000);
        } else {
            // If no pakka party is selected, disable and clear pakka amount
            pakkaAmountField.value = "0";
            pakkaAmountField.disabled = true;
            
            // Update kaccha amount to total
            document.getElementById('kacchaAmount').value = total.toFixed(2);
            
            calculateTotal(); // Recalculate to update validation
        }
    });

    // Setup initial row listeners
    lineItemsTable.querySelectorAll('tbody tr').forEach(setupRowListeners);
    expensesTable.querySelectorAll('tbody tr').forEach(setupExpenseListeners);

    // Add listeners for pakka and kaccha amounts
    document.getElementById('pakkaAmount').addEventListener('input', calculateTotal);
    document.getElementById('kacchaAmount').addEventListener('input', calculateTotal);

    // Form submission
    invoiceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Calculate total
        const total = calculateTotal();
        const pakkaAmount = parseFloat(document.getElementById('pakkaAmount').value) || 0;
        const kacchaAmount = parseFloat(document.getElementById('kacchaAmount').value) || 0;
        
        // Validate pakka + kaccha = total
        if (!validatePakkaKacchaTotal(pakkaAmount, kacchaAmount, total)) {
            showNotification('Pakka amount + Kaccha amount must equal the total bill amount', 'error');
            return;
        }
        
        // Validate pakka party selection if pakka amount is provided
        if (pakkaAmount > 0 && !document.getElementById('pakkaParty').value) {
            showNotification('Please select a Seller Party for the Pakka Amount', 'error');
            return;
        }
        
        // Validate that at least one line item exists
        if (lineItemsTable.querySelectorAll('tbody tr').length === 0) {
            showNotification('Please add at least one line item', 'error');
            return;
        }
        
        // Collect form data
        const formData = {
            party_id: parseInt(document.getElementById('party').value),
            date: document.getElementById('date').value,
            vehicleNumber: document.getElementById('vehicleNumber').value,
            lineItems: [],
            expenses: [],
            pakkaParty: document.getElementById('pakkaParty').value ? parseInt(document.getElementById('pakkaParty').value) : null,
            pakkaAmount: pakkaAmount,
            kacchaAmount: kacchaAmount
        };

        // Collect line items
        lineItemsTable.querySelectorAll('tbody tr').forEach(row => {
            formData.lineItems.push({
                description: row.querySelector('input[name="description[]"]').value,
                quantity: parseFloat(row.querySelector('input[name="quantity[]"]').value),
                rate: parseFloat(row.querySelector('input[name="rate[]"]').value),
                amount: parseFloat(row.querySelector('.amount').textContent)
            });
        });

        // Collect expenses
        expensesTable.querySelectorAll('tbody tr').forEach(row => {
            formData.expenses.push({
                type: row.querySelector('input[name="expenseType[]"]').value,
                amount: parseFloat(row.querySelector('input[name="expenseAmount[]"]').value)
            });
        });

        // Send data to server
        fetch('/api/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to create invoice');
                });
            }
            return response.json();
        })
        .then(data => {
            // Show success notification with balance update information
            let successMessage = 'Invoice created successfully!';
            
            // If the invoice has a party, fetch their updated balance
            if (formData.party_id) {
                fetch(`/api/parties/${formData.party_id}`)
                    .then(response => response.json())
                    .then(partyData => {
                        const partyName = document.getElementById('party').options[document.getElementById('party').selectedIndex].text;
                        const newBalance = parseFloat(partyData.outstanding_balance).toFixed(2);
                        
                        // Show notification with updated balance
                        showNotification(
                            `Invoice created successfully! ${partyName}'s outstanding balance is now ₹${newBalance}`,
                            'success',
                            3000
                        );
                    })
                    .catch(error => {
                        console.error('Error fetching updated party balance:', error);
                        showNotification(successMessage, 'success');
                    });
            } else {
                showNotification(successMessage, 'success');
            }
            
            // If there's a pakka party, also show their updated balance
            if (formData.pakkaParty && formData.pakkaAmount > 0) {
                fetch(`/api/parties/${formData.pakkaParty}`)
                    .then(response => response.json())
                    .then(pakkaPartyData => {
                        const pakkaPartyName = document.getElementById('pakkaParty').options[document.getElementById('pakkaParty').selectedIndex].text;
                        const pakkaBalance = parseFloat(pakkaPartyData.outstanding_balance).toFixed(2);
                        
                        // Show notification with updated pakka party balance
                        showNotification(
                            `Pakka party ${pakkaPartyName}'s outstanding balance is now ₹${pakkaBalance}`,
                            'info',
                            3000
                        );
                    })
                    .catch(error => {
                        console.error('Error fetching updated pakka party balance:', error);
                    });
            }
            
            // Redirect to invoices list after delay
            setTimeout(() => {
                window.location.href = '/invoices';
            }, 3500);
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification(error.message, 'error');
        });
    });

    // Function to show notifications
    function showNotification(message, type = 'info', timeout = 5000) {
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
        
        // Auto remove after specified timeout
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, timeout);
    }
});
