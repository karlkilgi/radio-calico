document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email })
        });

        if (response.ok) {
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            loadUsers();
            alert('User added successfully!');
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        const userList = document.getElementById('userList');
        userList.innerHTML = users.map(user => `
            <div class="user-item">
                <strong>${user.name}</strong> (${user.email})<br>
                <small>Added: ${new Date(user.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load users on page load
loadUsers();