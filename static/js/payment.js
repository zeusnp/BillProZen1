document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('paymentForm');
    const partySelect = document.getElementById('party');
    const outstandingDues = document.getElementById('outstandingDues');
    const pastDues = document.getElementById('pastDues');
    const paymentAmount = document.getElementById('paymentAmount');
    const balanceInfo = document.getElementById('balanceInfo');
    const totalOutstanding = document.getElementById('totalOutstanding');
    const paymentDisplay = document.getElementById('paymentDisplay');
    const remainingBalance = document.getElementById('remainingBalance');
    const successToast = document.getElementById('successToast');

    // Set today's date as default
    document.getElementById('paymentDate').valueAsDate = new Date();

    // Format currency
    function formatCurrency(amount) {
        return '₹' + parseFloat(amount).toFixed(2);
    }

    // Update balance calculations
    function updateBalanceInfo() {
        const outstanding = parseFloat(outstandingDues.textContent.replace('₹', '')) || 0;
        const payment = parseFloat(paymentAmount.value) || 0;
        const remaining = outstanding - payment;

        totalOutstanding.textContent = formatCurrency(outstanding);
        paymentDisplay.textContent = formatCurrency(payment);
        remainingBalance.textContent = formatCurrency(remaining);
        
        balanceInfo.style.display = payment > 0 ? 'block' : 'none';
    }

    // Fetch party dues when party is selected
    partySelect.addEventListener('change', async function() {
        const partyId = this.value;
        if (!partyId) {
            outstandingDues.textContent = formatCurrency(0);
            pastDues.textContent = formatCurrency(0);
            balanceInfo.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/party-dues/${partyId}`);
            const data = await response.json();
            
            if (response.ok) {
                outstandingDues.textContent = formatCurrency(data.outstanding_dues);
                pastDues.textContent = formatCurrency(data.past_dues);
                updateBalanceInfo();
            } else {
                console.error('Error fetching party dues:', data.error);
                showNotification('Error fetching party dues', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error', 'error');
        }
    });

    // Update balance info when payment amount changes
    paymentAmount.addEventListener('input', updateBalanceInfo);

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Basic validation
        if (!form.checkValidity()) {
            return;
        }

        const formData = {
            party_id: partySelect.value,
            payment_date: document.getElementById('paymentDate').value,
            amount: parseFloat(paymentAmount.value),
            notes: document.getElementById('notes').value
        };

        try {
            // Send payment data to server
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update the outstanding balance display with the new balance
                outstandingDues.textContent = formatCurrency(data.new_balance);
                
                // Update the balance info section
                updateBalanceInfo();
                
                // Show success message with updated balance information
                showNotification(`Payment of ${formatCurrency(formData.amount)} recorded successfully. New balance: ${formatCurrency(data.new_balance)}`, 'success');
                
                // Reset form fields except party selection
                const selectedPartyId = partySelect.value;
                const selectedPartyName = partySelect.options[partySelect.selectedIndex].text;
                
                document.getElementById('paymentDate').valueAsDate = new Date();
                document.getElementById('paymentAmount').value = '';
                document.getElementById('notes').value = '';
                
                // Keep the same party selected but update the balance display
                setTimeout(() => {
                    // Refetch the party dues to ensure we have the latest data
                    fetch(`/api/party-dues/${selectedPartyId}`)
                        .then(response => response.json())
                        .then(updatedData => {
                            outstandingDues.textContent = formatCurrency(updatedData.outstanding_dues);
                            pastDues.textContent = formatCurrency(updatedData.past_dues);
                            updateBalanceInfo();
                        })
                        .catch(error => {
                            console.error('Error refreshing party dues:', error);
                        });
                }, 500);
            } else {
                showNotification(data.error || 'Failed to record payment', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error', 'error');
        }
    });
    
    // Show notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
});
