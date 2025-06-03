document.addEventListener('DOMContentLoaded', function() {
    const partyList = document.querySelector('.parties-list');
    const partySearch = document.getElementById('party-search');
    const deleteButton = document.getElementById('delete-party-btn');
    const noSelection = document.getElementById('no-selection');
    const partyContent = document.getElementById('party-content');
    const addPartyBtn = document.getElementById('add-party-btn');
    const editPartyBtn = document.getElementById('edit-party-btn');
    
    // Modal elements
    const partyModal = document.getElementById('party-modal');
    const closeModal = document.getElementById('close-modal');
    const cancelForm = document.getElementById('cancel-form');
    const partyForm = document.getElementById('party-form');
    const modalTitle = document.getElementById('modal-title');
    
    // Confirmation modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const closeConfirm = document.getElementById('close-confirm');
    const cancelDelete = document.getElementById('cancel-delete');
    const confirmDelete = document.getElementById('confirm-delete');
    
    let selectedParty = null;
    let selectedPartyId = null;

    // Search functionality
    partySearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const parties = partyList.querySelectorAll('.party-item');
        
        parties.forEach(party => {
            const partyName = party.querySelector('h3').textContent.toLowerCase();
            const partyAddress = party.querySelector('.party-address').textContent.toLowerCase();
            const partyContact = party.querySelector('.party-contact').textContent.toLowerCase();
            
            if (partyName.includes(searchTerm) || 
                partyAddress.includes(searchTerm) || 
                partyContact.includes(searchTerm)) {
                party.style.display = 'block';
            } else {
                party.style.display = 'none';
            }
        });
    });

    // Party selection
    partyList.addEventListener('click', function(e) {
        const partyItem = e.target.closest('.party-item');
        if (!partyItem) return;

        // Update selection
        const previousSelected = partyList.querySelector('.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        partyItem.classList.add('selected');
        deleteButton.disabled = false;

        // Fetch party details
        selectedPartyId = partyItem.dataset.id;
        fetch(`/api/parties/${selectedPartyId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(party => {
                selectedParty = party;
                displayPartyDetails(party);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading party details', 'error');
            });
    });

    // Display party details
    function displayPartyDetails(party) {
        noSelection.style.display = 'none';
        partyContent.style.display = 'block';

        // Update header
        document.getElementById('selected-party-name').textContent = party.name;
        document.getElementById('selected-party-balance').textContent = 
            `Opening: ₹${parseFloat(party.outstanding_balance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Update info
        document.getElementById('selected-party-type').textContent = 
            party.party_type === 'buyer' ? 'Buyer' : 'Seller';
        document.getElementById('selected-party-contact').textContent = party.contact_person || 'Not specified';
        document.getElementById('selected-party-phone').textContent = party.phone || 'Not specified';
        document.getElementById('selected-party-email').textContent = party.email || 'Not specified';
        document.getElementById('selected-party-address').textContent = party.address || 'Not specified';
        document.getElementById('selected-party-gst').textContent = party.gst_number || 'Not specified';
        document.getElementById('selected-party-outstanding').textContent = 
            `₹${parseFloat(party.outstanding_balance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Billing history will be implemented in future updates
        // For now, we'll just show a placeholder
        const billingHistory = document.getElementById('billing-history');
        billingHistory.innerHTML = `<tr><td colspan="4" class="empty-table">No billing history available yet</td></tr>`;
    }

    // Add Party button click handler
    addPartyBtn.addEventListener('click', function() {
        openPartyModal('add');
    });

    // Edit Party button click handler
    editPartyBtn.addEventListener('click', function() {
        if (selectedParty) {
            openPartyModal('edit');
        }
    });

    // Add Pakka Balance button click handler
    document.getElementById('add-pakka-balance').addEventListener('click', function() {
        addPakkaBalanceRow();
    });

    // Function to add a new pakka balance row
    function addPakkaBalanceRow(partyId = '', amount = 0) {
        const container = document.getElementById('pakka-balances-container');
        const rowIndex = container.children.length;
        
        const row = document.createElement('div');
        row.className = 'pakka-balance-row';
        row.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Pakka Party</label>
                    <select class="pakka-party-select" name="pakka_party_id_${rowIndex}" required>
                        <option value="">Select Seller Party</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" class="pakka-amount" name="pakka_amount_${rowIndex}" step="0.01" value="${amount}">
                </div>
                <button type="button" class="btn-remove-pakka">
                    <i class="material-icons">delete</i>
                </button>
            </div>
        `;
        
        container.appendChild(row);
        
        // Add event listener for remove button
        row.querySelector('.btn-remove-pakka').addEventListener('click', function() {
            container.removeChild(row);
        });
        
        // Fetch seller parties and populate dropdown
        fetchSellerParties(row.querySelector('.pakka-party-select'), partyId);
    }
    
    // Function to fetch seller parties for dropdown
    function fetchSellerParties(selectElement, selectedPartyId = '') {
        fetch('/api/parties/sellers')
            .then(response => response.json())
            .then(sellers => {
                // Add seller parties to dropdown
                sellers.forEach(seller => {
                    const option = document.createElement('option');
                    option.value = seller.id;
                    option.textContent = seller.name;
                    if (seller.id == selectedPartyId) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching seller parties:', error);
                showNotification('Failed to load seller parties', 'error');
            });
    }

    // Delete Party button click handler
    deleteButton.addEventListener('click', function() {
        if (selectedParty) {
            openConfirmModal();
        }
    });

    // Open party modal for add or edit
    function openPartyModal(mode) {
        modalTitle.textContent = mode === 'add' ? 'Add Party' : 'Edit Party';
        
        if (mode === 'edit' && selectedParty) {
            // Fill form with selected party data
            document.getElementById('party-id').value = selectedParty.id;
            document.getElementById('party-name').value = selectedParty.name || '';
            document.getElementById('party-type').value = selectedParty.party_type || '';
            document.getElementById('contact-person').value = selectedParty.contact_person || '';
            document.getElementById('phone').value = selectedParty.phone || '';
            document.getElementById('email').value = selectedParty.email || '';
            document.getElementById('address').value = selectedParty.address || '';
            document.getElementById('gst-number').value = selectedParty.gst_number || '';
            document.getElementById('kaccha-balance').value = selectedParty.kaccha_balance || 0.00;
        } else {
            // Clear form for new party
            partyForm.reset();
            document.getElementById('party-id').value = '';
        }
        
        partyModal.style.display = 'block';
    }

    // Close party modal
    function closePartyModal() {
        partyModal.style.display = 'none';
        partyForm.reset();
    }

    // Open confirm delete modal
    function openConfirmModal() {
        confirmModal.style.display = 'block';
    }

    // Close confirm delete modal
    function closeConfirmModal() {
        confirmModal.style.display = 'none';
    }

    // Modal close button
    closeModal.addEventListener('click', closePartyModal);
    cancelForm.addEventListener('click', closePartyModal);

    // Confirmation modal close buttons
    closeConfirm.addEventListener('click', closeConfirmModal);
    cancelDelete.addEventListener('click', closeConfirmModal);

    // Handle form submission
    partyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const partyId = document.getElementById('party-id').value;
        const isEdit = partyId !== '';
        
        // Collect form data
        const formData = {
            name: document.getElementById('party-name').value,
            party_type: document.getElementById('party-type').value,
            contact_person: document.getElementById('contact-person').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            gst_number: document.getElementById('gst-number').value,
            kaccha_balance: parseFloat(document.getElementById('kaccha-balance').value) || 0,
            pakka_balances: []
        };
        
        // Collect pakka balances
        const pakkaBalanceRows = document.querySelectorAll('.pakka-balance-row');
        pakkaBalanceRows.forEach(row => {
            const partySelect = row.querySelector('.pakka-party-select');
            const amountInput = row.querySelector('.pakka-amount');
            
            if (partySelect.value && amountInput.value) {
                formData.pakka_balances.push({
                    party_id: partySelect.value,
                    amount: parseFloat(amountInput.value) || 0
                });
            }
        });
        
        // API endpoint and method
        const url = isEdit ? `/api/parties/${partyId}` : '/api/parties';
        const method = isEdit ? 'PUT' : 'POST';
        
        // Send request
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            closePartyModal();
            showNotification(`Party ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            
            // Refresh the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification(`Error ${isEdit ? 'updating' : 'adding'} party`, 'error');
        });
    });

    // Handle party deletion
    confirmDelete.addEventListener('click', function() {
        if (!selectedPartyId) {
            closeConfirmModal();
            return;
        }
        
        fetch(`/api/parties/${selectedPartyId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            closeConfirmModal();
            showNotification('Party deleted successfully', 'success');
            
            // Reset selection and refresh
            selectedParty = null;
            selectedPartyId = null;
            noSelection.style.display = 'flex';
            partyContent.style.display = 'none';
            deleteButton.disabled = true;
            
            // Remove from list
            const partyElement = document.querySelector(`.party-item[data-id="${selectedPartyId}"]`);
            if (partyElement) {
                partyElement.remove();
            }
            
            // Refresh the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error deleting party', 'error');
            closeConfirmModal();
        });
    });

    // Show notification
    function showNotification(message, type = 'info') {
        // Check if notification container exists, create if not
        let notificationContainer = document.querySelector('.notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === partyModal) {
            closePartyModal();
        }
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
});
