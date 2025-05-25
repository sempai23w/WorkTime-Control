// login.js
// Redireciona para o dashboard após login simples

// Removendo validação de senha complexa para aceitar qualquer senha com pelo menos 8 caracteres
function validatePassword(password) {
    return password.length >= 8;
}

// Exibe mensagens estilizadas no formulário
function showMessage(type, message) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.textContent = message;
    messageContainer.className = `alert alert-${type} mt-3`;
    messageContainer.style.display = 'block';
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

// Substitui showError por showMessage para erros
function showError(message) {
    showMessage('danger', message);
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!validatePassword(password)) {
        showError('A senha deve conter pelo menos 8 caracteres.');
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('wtc_user', email);
            localStorage.setItem('token', result.token);
            localStorage.setItem('wtc_role', result.role); // Adicionando o papel do usuário ao localStorage
            localStorage.setItem('wtc_token', result.token); // Adicionado armazenamento do token JWT no localStorage após login bem-sucedido
            window.location.href = result.role === 'admin' ? 'pages/admin.html' : 'pages/dashboard.html';
        } else {
            showError(result.error || 'Erro ao fazer login.');
        }
    } catch (error) {
        showError('Erro ao conectar ao servidor.');
    }
});
