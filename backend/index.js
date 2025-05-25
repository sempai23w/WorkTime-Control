const express = require('express');
const app = express();
const port = 3000;
const db = require('./database');
const path = require('path');
const jwt = require('jsonwebtoken');
const secretKey = '2853fb2458ca1ce2c4b563d33b804668be5be9b85d0d115fb9656eef5555499b52fe304e7bdd988f8977b1d0e324db0d62c14a4e516e909334fe843b6ab99307'; // Substitua por uma chave secreta segura

// Middleware para parsear JSON
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../')));

// Rota inicial de teste
app.get('/', (req, res) => {
    res.send('Backend funcionando!');
});

// Rota para registro de solicitação
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Adicionei logs para depuração
    console.log('Recebendo solicitação de registro:', { name, email });

    const query = `INSERT INTO registration_requests (name, email, password) VALUES (?, ?, ?)`;
    db.run(query, [name, email, password], function (err) {
        if (err) {
            console.error('Erro ao executar query:', err);
            return res.status(500).json({ error: 'Erro ao registrar solicitação.' });
        }
        console.log('Solicitação registrada com sucesso, ID:', this.lastID);
        res.status(201).json({ message: 'Solicitação de registro enviada com sucesso!' });
    });
});

// Rota para login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('Login falhou: Email ou senha não fornecidos.');
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    console.log('Tentativa de login com email:', email);

    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], (err, user) => {
        if (err) {
            console.error('Erro ao buscar usuário no banco de dados:', err);
            return res.status(500).json({ error: 'Erro interno do servidor.' });
        }

        if (!user) {
            console.log('Login falhou: Usuário não encontrado para o email:', email);
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        console.log('Usuário encontrado:', user);

        if (password !== user.password) {
            console.log('Login falhou: Senha inválida para o email:', email);
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        console.log('Login bem-sucedido para o email:', email);

        // Gerar token JWT
        const token = jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login bem-sucedido!', role: user.role, token });
    });
});

// Middleware para verificar autenticação e autorização
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        console.log('Acesso negado: Token não fornecido.');
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido.' });
        }
        req.user = user;
        next();
    });
}

function verifyAdmin(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Acesso não autorizado. Token ausente.' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);

        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

// Rota protegida para o painel admin
app.get('/admin', verifyAdmin, (req, res) => {
    res.json({ message: 'Acesso autorizado ao painel admin.' });
});

// Rota protegida para o dashboard
app.get('/dashboard', authenticateToken, (req, res) => {
    res.json({ message: 'Acesso ao dashboard autorizado.' });
});

// Rota para aprovar ou rejeitar solicitações
app.post('/requests/:id', (req, res) => {
    const { id } = req.params;
    const { action, role } = req.body;

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Ação inválida.' });
    }

    const query = action === 'approve'
        ? `INSERT INTO users (name, email, password, role) SELECT name, email, password, ? FROM registration_requests WHERE id = ?`
        : `DELETE FROM registration_requests WHERE id = ?`;

    const params = action === 'approve' ? [role, id] : [id];

    db.run(query, params, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao processar solicitação.' });
        }

        // Remover a solicitação após aprovação ou rejeição
        if (action === 'approve') {
            db.run(`DELETE FROM registration_requests WHERE id = ?`, [id]);
        }

        res.status(200).json({ message: `Solicitação ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso!` });
    });
});

// Rota para listar solicitações pendentes
app.get('/requests', (req, res) => {
    const query = `SELECT * FROM registration_requests WHERE status = 'pending'`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar solicitações.' });
        }
        res.status(200).json(rows);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
