document.addEventListener('DOMContentLoaded', function() {
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const addUserBtn = document.getElementById('addUser');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modalTitle');
    const themeButtons = document.querySelectorAll('.theme-btn');
    const currencySelect = document.getElementById('currency');
    const backupDataBtn = document.getElementById('backupData');
    const exportDataBtn = document.getElementById('exportData');

    let editingUserId = null;

    // Modal Functions
    function openModal(title = 'Add User') {
        modalTitle.textContent = title;
        userModal.style.display = 'flex';
    }

    function closeModal() {
        userModal.style.display = 'none';
        userForm.reset();
        editingUserId = null;
    }

    // Add User Button Click
    addUserBtn.addEventListener('click', () => {
        openModal('Add User');
    });

    // Close Modal Button Click
    closeModalBtn.addEventListener('click', closeModal);

    // Close Modal on Outside Click
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
            closeModal();
        }
    });

    // Edit User Click
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.dataset.id;
            editingUserId = userId;
            
            try {
                const response = await fetch(`/api/users/${userId}`);
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userName').value = user.name;
                    document.getElementById('userEmail').value = user.email;
                    document.getElementById('userRole').value = user.role;
                    document.getElementById('userStatus').value = user.status;
                    openModal('Edit User');
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                alert('Error loading user data');
            }
        });
    });

    // Form Submit
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value
        };

        try {
            const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
            const method = editingUserId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                closeModal();
                window.location.reload(); // Refresh to show changes
            } else {
                const error = await response.json();
                alert(error.message || 'Error saving user');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error saving user');
        }
    });

    // Theme Toggle
    themeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const theme = button.dataset.theme;
            
            try {
                const response = await fetch('/api/preferences', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ theme })
                });

                if (response.ok) {
                    // Update UI
                    themeButtons.forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.theme === theme);
                    });
                    // Apply theme to document
                    document.documentElement.setAttribute('data-theme', theme);
                }
            } catch (error) {
                console.error('Error updating theme:', error);
                alert('Error updating theme');
            }
        });
    });

    // Currency Change
    currencySelect.addEventListener('change', async () => {
        const currency = currencySelect.value;
        
        try {
            const response = await fetch('/api/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ default_currency: currency })
            });

            if (!response.ok) {
                throw new Error('Failed to update currency');
            }
        } catch (error) {
            console.error('Error updating currency:', error);
            alert('Error updating currency preference');
        }
    });

    // Backup Data
    backupDataBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/backup', {
                method: 'POST'
            });

            if (response.ok) {
                alert('Data backup created successfully');
            } else {
                throw new Error('Failed to create backup');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('Error creating data backup');
        }
    });

    // Export Data
    exportDataBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/export');
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'billprozen_data_export.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                throw new Error('Failed to export data');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data');
        }
    });

    // Form Validation
    document.getElementById('userEmail').addEventListener('input', function(e) {
        const email = e.target.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        e.target.setCustomValidity(
            emailRegex.test(email) ? '' : 'Please enter a valid email address'
        );
    });

    document.getElementById('userName').addEventListener('input', function(e) {
        const name = e.target.value;
        e.target.setCustomValidity(
            name.length >= 2 ? '' : 'Name must be at least 2 characters long'
        );
    });
});
