document.addEventListener('DOMContentLoaded', function() {
    // Time period tabs functionality
    const tabs = document.querySelectorAll('.tab');
    
    // Map tab text to period parameter
    const periodMap = {
        'Today': 'today',
        'Last 7 Days': 'week',
        'Last 30 Days': 'month'
    };
    
    // Check if there's an error message to display
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && errorMessage.textContent) {
        showNotification(errorMessage.textContent, 'error');
    }
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Skip if already active
            if (tab.classList.contains('active')) {
                return;
            }
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show loading state
            showNotification('Loading dashboard data...', 'info');
            
            // Get period from tab text
            const period = periodMap[tab.textContent.trim()];
            
            // Redirect to dashboard with the selected period
            window.location.href = `/dashboard?period=${period}`;
        });
    });

    // Add hover effect to table rows
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });
        
        // Make rows clickable if they represent invoices
        if (row.dataset.type === 'Invoice') {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                const invoiceNumber = row.dataset.id;
                if (invoiceNumber) {
                    window.location.href = `/invoices/view/${invoiceNumber}`;
                }
            });
        }
    });
    
    // Function to show notifications
    function showNotification(message, type = 'info') {
        // Check if notification container exists, create if not
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '1000';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.padding = '12px 20px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.transition = 'all 0.3s ease';
        
        // Set background color based on type
        if (type === 'error') {
            notification.style.backgroundColor = '#f44336';
            notification.style.color = 'white';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#4CAF50';
            notification.style.color = 'white';
        } else {
            notification.style.backgroundColor = '#2196F3';
            notification.style.color = 'white';
        }
        
        notification.textContent = message;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.marginLeft = '10px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.float = 'right';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.addEventListener('click', function() {
            notification.remove();
        });
        notification.appendChild(closeBtn);
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
});
