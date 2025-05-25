// admin.js
// Exibe todos os registros dos funcionários

function getAllRecords() {
    const records = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('wtc_') && key !== 'wtc_user') {
            const [_, user, date] = key.split('_');
            const data = JSON.parse(localStorage.getItem(key));
            records.push({ user, date, ...data });
        }
    }
    return records;
}

// Filtros e busca
const searchInput = document.getElementById('searchInput');
const filterPeriodo = document.getElementById('filterPeriodo');

function getPeriodoFiltro(date, periodo) {
    const hoje = new Date();
    const data = new Date(date);
    if (periodo === 'dia') {
        return data.toDateString() === hoje.toDateString();
    }
    if (periodo === 'semana') {
        const firstDay = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        const lastDay = new Date(hoje.setDate(hoje.getDate() - hoje.getDay() + 6));
        return data >= firstDay && data <= lastDay;
    }
    if (periodo === 'mes') {
        return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    }
    return true;
}

function renderAdminTable() {
    const container = document.getElementById('adminTableContainer');
    let records = getAllRecords();
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const periodo = filterPeriodo ? filterPeriodo.value : '';
    if (search) {
        records = records.filter(r => r.user.toLowerCase().includes(search));
    }
    if (periodo) {
        records = records.filter(r => getPeriodoFiltro(r.date, periodo));
    }
    if (records.length === 0) {
        container.innerHTML = '<p>Nenhum registro encontrado.</p>';
        return;
    }
    let html = '<table class="table table-striped table-bordered align-middle"><thead class="table-light"><tr><th>Funcionário</th><th>Data</th><th>Horários</th><th>Total Horas</th><th>Atividades</th></tr></thead><tbody>';
    records.forEach(r => {
        const times = r.times.map(t => `<span class='fw-semibold'>${t.label}:</span> ${t.time}`).join('<br>');
        const totalHoras = calcularTotalHoras(r.times);
        html += `<tr><td>${r.user}</td><td>${r.date}</td><td>${times}</td><td>${totalHoras}</td><td>${r.activity || ''}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function calcularTotalHoras(times) {
    let entrada = null, saida = null;
    times.forEach(t => {
        if (t.label === 'Entrada') entrada = t.time;
        if (t.label === 'Saída') saida = t.time;
    });
    if (!entrada || !saida) return '00:00';
    function toMinutos(hora) {
        const [h, m] = hora.split(':');
        return parseInt(h) * 60 + parseInt(m);
    }
    let total = toMinutos(saida) - toMinutos(entrada);
    if (total < 0) total += 24 * 60;
    const h = String(Math.floor(total / 60)).padStart(2, '0');
    const m = String(total % 60).padStart(2, '0');
    return `${h}:${m}`;
}

// Função para aprovar ou rejeitar solicitações
function handleRequest(id, action, role = 'user') {
    fetch(`/requests/${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, role }),
    })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message);
            // Atualizar a tabela após a ação
            renderRequests();
        })
        .catch((error) => {
            console.error('Erro:', error);
        });
}

// Atualiza a tabela de solicitações dinamicamente
function renderRequests() {
    fetch('/requests')
        .then((response) => response.json())
        .then((data) => {
            const registrationRequestsContainer = document.getElementById('registrationRequests');
            registrationRequestsContainer.innerHTML = '';

            data.forEach((request) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.name}</td>
                    <td>${request.email}</td>
                    <td>
                        <select class="form-select form-select-sm me-2" style="width: auto; display: inline-block;">
                            <option value="user">Usuário</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button class="btn btn-success btn-sm me-2" onclick="handleRequest(${request.id}, 'approve', this.previousElementSibling.value)">Aprovar</button>
                        <button class="btn btn-danger btn-sm" onclick="handleRequest(${request.id}, 'reject')">Rejeitar</button>
                    </td>
                `;
                registrationRequestsContainer.appendChild(row);
            });
        })
        .catch((error) => {
            console.error('Erro ao carregar solicitações:', error);
        });
}

// Verifica se o usuário está autenticado e possui o papel de administrador
function checkAdminAccess() {
    fetch('/admin', {
        method: 'GET',
        headers: {
            'Authorization': localStorage.getItem('token')
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Acesso negado');
            }
            return response.json();
        })
        .then(() => {
            console.log('Acesso autorizado ao painel admin.');
        })
        .catch(() => {
            alert('Você precisa estar autenticado como administrador para acessar esta página.');
            window.location.href = '/index.html';
        });
}

if (searchInput) searchInput.addEventListener('input', renderAdminTable);
if (filterPeriodo) filterPeriodo.addEventListener('change', renderAdminTable);

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    renderAdminTable();
    renderRequests();
});
