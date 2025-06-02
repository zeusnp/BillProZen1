document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const filterParty = document.getElementById('filterParty');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    const transactionsTableBody = document.getElementById('transactionsTableBody');
    const noTransactions = document.getElementById('noTransactions');
    const loadingTransactions = document.getElementById('loadingTransactions');
    
    // Edit Modal Elements
    const editTransactionModal = document.getElementById('editTransactionModal');
    const editTransactionForm = document.getElementById('editTransactionForm');
    const editTransactionId = document.getElementById('editTransactionId');
    const editParty = document.getElementById('editParty');
    const editPaymentDate = document.getElementById('editPaymentDate');
    const editPaymentAmount = document.getElementById('editPaymentAmount');
    const editNotes = document.getElementById('editNotes');
    
    // Delete Modal Elements
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteAmount = document.getElementById('deleteAmount');
    const deleteParty = document.getElementById('deleteParty');
    const deleteDate = document.getElementById('deleteDate');
    const confirmDelete = document.getElementById('confirmDelete');
    const cancelDelete = document.getElementById('cancelDelete');
    
    // Close modal buttons
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    startDate.valueAsDate = firstDay;
    endDate.valueAsDate = today;
    
    // Format date for display
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Format currency
    function formatCurrency(amount) {
        return '₹' + parseFloat(amount).toFixed(2);
    }
    
    // Load transactions with optional filters
    async function loadTransactions() {
        loadingTransactions.style.display = 'flex';
        noTransactions.style.display = 'none';
        transactionsTableBody.innerHTML = '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (filterParty.value) params.append('party_id', filterParty.value);
        if (startDate.value) params.append('start_date', startDate.value);
        if (endDate.value) params.append('end_date', endDate.value);
        
        try {
            const response = await fetch(`/api/transactions?${params.toString()}`);
            const transactions = await response.json();
            
            if (transactions.length === 0) {
                noTransactions.style.display = 'block';
            } else {
                renderTransactions(transactions);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            showNotification('Failed to load transactions', 'error');
        } finally {
            loadingTransactions.style.display = 'none';
        }
    }
    
    // Render transactions to table
    function renderTransactions(transactions) {
        transactionsTableBody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.dataset.id = transaction.id;
            
            row.innerHTML = `
                <td>${formatDate(transaction.payment_date)}</td>
                <td>${transaction.party_name || 'Unknown Party'}</td>
                <td class="transaction-amount">${formatCurrency(transaction.amount)}</td>
                <td class="transaction-notes">${transaction.notes || '-'}</td>
                <td class="transaction-actions">
                    <button class="btn-edit" data-id="${transaction.id}" title="Edit Transaction">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-delete" data-id="${transaction.id}" title="Delete Transaction">
                        <i class="material-icons">delete</i>
                    </button>
                </td>
            `;
            
            transactionsTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', () => openEditModal(button.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', () => openDeleteModal(button.dataset.id));
        });
    }
    
    // Open edit transaction modal
    async function openEditModal(transactionId) {
        try {
            const response = await fetch(`/api/transactions/${transactionId}`);
            const transaction = await response.json();
            
            if (response.ok) {
                editTransactionId.value = transaction.id;
                editParty.value = transaction.party_id;
                editPaymentDate.value = transaction.payment_date.split('T')[0]; // Format date for input
                editPaymentAmount.value = transaction.amount;
                editNotes.value = transaction.notes || '';
                
                editTransactionModal.style.display = 'block';
            } else {
                showNotification(transaction.error || 'Failed to load transaction details', 'error');
            }
        } catch (error) {
            console.error('Error loading transaction details:', error);
            showNotification('Network error', 'error');
        }
    }
    
    // Open delete confirmation modal
    async function openDeleteModal(transactionId) {
        try {
            const response = await fetch(`/api/transactions/${transactionId}`);
            const transaction = await response.json();
            
            if (response.ok) {
                // Store transaction ID for delete confirmation
                confirmDelete.dataset.id = transaction.id;
                
                // Set details in the modal
                deleteAmount.textContent = formatCurrency(transaction.amount);
                deleteParty.textContent = transaction.party_name || 'Unknown Party';
                deleteDate.textContent = formatDate(transaction.payment_date);
                
                deleteConfirmModal.style.display = 'block';
            } else {
                showNotification(transaction.error || 'Failed to load transaction details', 'error');
            }
        } catch (error) {
            console.error('Error loading transaction details:', error);
            showNotification('Network error', 'error');
        }
    }
    
    // Update transaction
    async function updateTransaction(event) {
        event.preventDefault();
        
        const transactionId = editTransactionId.value;
        const formData = {
            party_id: editParty.value,
            payment_date: editPaymentDate.value,
            amount: parseFloat(editPaymentAmount.value),
            notes: editNotes.value
        };
        
        try {
            const response = await fetch(`/api/transactions/${transactionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                closeModal(editTransactionModal);
                showNotification('Transaction updated successfully');
                loadTransactions(); // Reload the transactions list
            } else {
                showNotification(data.error || 'Failed to update transaction', 'error');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            showNotification('Network error', 'error');
        }
    }
    
    // Delete transaction
    async function deleteTransaction() {
        const transactionId = confirmDelete.dataset.id;
        
        try {
            const response = await fetch(`/api/transactions/${transactionId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                closeModal(deleteConfirmModal);
                showNotification('Transaction deleted successfully');
                loadTransactions(); // Reload the transactions list
            } else {
                showNotification(data.error || 'Failed to delete transaction', 'error');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showNotification('Network error', 'error');
        }
    }
    
    // Close modal
    function closeModal(modal) {
        modal.style.display = 'none';
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</i>
            <span>${message}</span>
        `;
        
        document.getElementById('notificationContainer').appendChild(notification);
        
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
    
    // Event Listeners
    applyFilters.addEventListener('click', loadTransactions);
    
    clearFilters.addEventListener('click', () => {
        filterParty.value = '';
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.valueAsDate = firstDay;
        endDate.valueAsDate = today;
        loadTransactions();
    });
    
    editTransactionForm.addEventListener('submit', updateTransaction);
    
    confirmDelete.addEventListener('click', deleteTransaction);
    
    cancelDelete.addEventListener('click', () => {
        closeModal(deleteConfirmModal);
    });
    
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeModal(button.closest('.modal'));
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === editTransactionModal) {
            closeModal(editTransactionModal);
        } else if (event.target === deleteConfirmModal) {
            closeModal(deleteConfirmModal);
        }
    });
    
    // Initial load
    loadTransactions();
});
