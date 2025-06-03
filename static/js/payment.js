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
    const paymentTypeSelect = document.getElementById('paymentType');
    const relatedPartyContainer = document.getElementById('relatedPartyContainer');
    const relatedPartySelect = document.getElementById('relatedParty');

    // Set today's date as default
    document.getElementById('paymentDate').valueAsDate = new Date();

    // Format currency
    function formatCurrency(amount) {
        return '₹' + parseFloat(amount).toFixed(2);
    }

    // Update balance calculations
    function updateBalanceInfo() {
        const paymentType = paymentTypeSelect.value;
        const outstanding = parseFloat(outstandingDues.textContent.replace('₹', '')) || 0;
        const payment = parseFloat(paymentAmount.value) || 0;
        const remaining = outstanding - payment;

        totalOutstanding.textContent = formatCurrency(outstanding);
        paymentDisplay.textContent = formatCurrency(payment);
        remainingBalance.textContent = formatCurrency(remaining);
        
        balanceInfo.style.display = payment > 0 ? 'block' : 'none';
    }

    // Show/hide related party dropdown based on payment type
    paymentTypeSelect.addEventListener('change', function() {
        const paymentType = this.value;
        
        // Show related party dropdown only for pakka payments
        if (paymentType === 'pakka') {
            relatedPartyContainer.style.display = 'block';
            
            // If we have pakka balances by seller, update the outstanding amount
            if (window.pakkaBySellerData && window.pakkaBySellerData.length > 0) {
                // If a seller is already selected, show their outstanding amount
                const selectedSellerId = relatedPartySelect.value;
                if (selectedSellerId) {
                    const sellerData = window.pakkaBySellerData.find(s => s.seller_id == selectedSellerId);
                    if (sellerData) {
                        outstandingDues.textContent = formatCurrency(sellerData.amount);
                        updateBalanceInfo();
                    }
                } else {
                    // Show total pakka outstanding
                    outstandingDues.textContent = formatCurrency(window.pakkaOutstanding || 0);
                    updateBalanceInfo();
                }
            }
        } else {
            relatedPartyContainer.style.display = 'none';
            // Show kaccha outstanding for kaccha payments
            outstandingDues.textContent = formatCurrency(window.kacchaOutstanding || 0);
            updateBalanceInfo();
        }
    });

    // Update outstanding amount when related party changes
    relatedPartySelect.addEventListener('change', function() {
        const selectedSellerId = this.value;
        if (selectedSellerId && window.pakkaBySellerData) {
            const sellerData = window.pakkaBySellerData.find(s => s.seller_id == selectedSellerId);
            if (sellerData) {
                outstandingDues.textContent = formatCurrency(sellerData.amount);
                updateBalanceInfo();
            }
        }
    });

    // Fetch party dues when party is selected
    partySelect.addEventListener('change', async function() {
        const partyId = this.value;
        if (!partyId) {
            outstandingDues.textContent = formatCurrency(0);
            pastDues.textContent = formatCurrency(0);
            balanceInfo.style.display = 'none';
            
            // Clear related party dropdown
            relatedPartySelect.innerHTML = '<option value="">Select Seller</option>';
            relatedPartyContainer.style.display = 'none';
            
            return;
        }

        try {
            const response = await fetch(`/api/party-dues/${partyId}`);
            const data = await response.json();
            
            if (response.ok) {
                // Store the data globally for later use
                window.totalOutstanding = data.total_outstanding_dues;
                window.pakkaOutstanding = data.pakka_outstanding;
                window.kacchaOutstanding = data.kaccha_outstanding;
                window.pakkaBySellerData = data.pakka_by_seller;
                
                // Set the appropriate outstanding amount based on payment type
                const paymentType = paymentTypeSelect.value;
                if (paymentType === 'pakka') {
                    outstandingDues.textContent = formatCurrency(data.pakka_outstanding);
                } else {
                    outstandingDues.textContent = formatCurrency(data.kaccha_outstanding);
                }
                
                pastDues.textContent = formatCurrency(data.past_dues);
                
                // Populate related party dropdown with sellers who have pakka balances
                relatedPartySelect.innerHTML = '<option value="">Select Seller</option>';
                if (data.pakka_by_seller && data.pakka_by_seller.length > 0) {
                    data.pakka_by_seller.forEach(seller => {
                        // Add seller ID to the data for easier reference
                        seller.seller_id = Object.keys(data.pakka_by_seller).find(
                            key => data.pakka_by_seller[key] === seller
                        );
                        
                        const option = document.createElement('option');
                        option.value = seller.seller_id;
                        option.textContent = `${seller.seller_name} (${formatCurrency(seller.amount)})`;
                        relatedPartySelect.appendChild(option);
                    });
                    
                    // Show related party dropdown for pakka payments
                    if (paymentType === 'pakka') {
                        relatedPartyContainer.style.display = 'block';
                    }
                }
                
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
            payment_type: paymentTypeSelect.value,
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
