// dashboard.js
// Controle de ponto e registro de atividades

const user = localStorage.getItem('wtc_user');
if (!user) window.location.href = '../index.html';

document.getElementById('logoutBtn').onclick = () => {
    localStorage.removeItem('wtc_user');
    window.location.href = '../index.html';
};

const timeLog = document.getElementById('timeLog');
const activityCard = document.getElementById('activityCard');
const activityDesc = document.getElementById('activityDesc');
const saveActivityBtn = document.getElementById('saveActivityBtn');

const todayKey = `wtc_${user}_${new Date().toISOString().slice(0, 10)}`;
let dayData = JSON.parse(localStorage.getItem(todayKey)) || { times: [], activity: '' };

// Exibe nome do usuário, data e relógio em tempo real
const userName = document.getElementById('userName');
const currentDate = document.getElementById('currentDate');
const clock = document.getElementById('clock');
const statusAtual = document.getElementById('statusAtual');
const totalHoras = document.getElementById('totalHoras');

if (userName) userName.textContent = user;
if (currentDate) {
    const hoje = new Date();
    currentDate.textContent = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}
if (clock) {
    function updateClock() {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// Adiciona botão de Retornar Pausa
const returnPauseBtn = document.createElement('button');
returnPauseBtn.id = 'returnPauseBtn';
returnPauseBtn.className = 'btn btn-info btn-lg px-4 py-2 shadow-sm';
returnPauseBtn.innerHTML = '<span class="fs-4">⏳</span> Retornar da Pausa';

const btnGroup = document.querySelector('.d-flex.gap-3.mb-4.flex-wrap.justify-content-center');
if (btnGroup && !document.getElementById('returnPauseBtn')) {
    btnGroup.insertBefore(returnPauseBtn, btnGroup.children[2]);
}

function getStatus() {
    if (!dayData.times.length) return 'Fora do Expediente';
    const last = dayData.times[dayData.times.length - 1];
    if (last.label === 'Entrada' || last.label === 'Retorno') return 'Trabalhando';
    if (last.label === 'Pausa') return 'Em Pausa';
    if (last.label === 'Saída') return 'Fora do Expediente';
    return 'Fora do Expediente';
}

function updateStatus() {
    const status = getStatus();
    if (statusAtual) {
        statusAtual.textContent = status;
        statusAtual.className = 'badge fs-6 ' +
            (status === 'Trabalhando' ? 'bg-success' : status === 'Em Pausa' ? 'bg-warning text-dark' : 'bg-secondary');
    }
    if (startWorkBtn && pauseBtn && endWorkBtn && returnPauseBtn) {
        if (status === 'Fora do Expediente') {
            startWorkBtn.disabled = false;
            pauseBtn.disabled = true;
            endWorkBtn.disabled = true;
            returnPauseBtn.disabled = true;
        } else if (status === 'Trabalhando') {
            startWorkBtn.disabled = true;
            pauseBtn.disabled = false;
            endWorkBtn.disabled = false;
            returnPauseBtn.disabled = true;
        } else if (status === 'Em Pausa') {
            startWorkBtn.disabled = true;
            pauseBtn.disabled = true;
            endWorkBtn.disabled = false;
            returnPauseBtn.disabled = false;
        }
    }
}

function calcularTotalHoras() {
    let entrada = null, saida = null;
    let pausas = [], retornos = [];
    dayData.times.forEach(t => {
        if (t.label === 'Entrada') entrada = t.time;
        if (t.label === 'Saída') saida = t.time;
        if (t.label === 'Pausa') pausas.push(t.time);
        if (t.label === 'Retorno') retornos.push(t.time);
    });
    if (!entrada || !saida) return '00:00';
    // Converter para minutos
    function toMinutos(hora) {
        const [h, m] = hora.split(':');
        return parseInt(h) * 60 + parseInt(m);
    }
    let total = toMinutos(saida) - toMinutos(entrada);
    if (total < 0) total += 24 * 60;
    // Desconta pausas
    let pausaTotal = 0;
    for (let i = 0; i < pausas.length; i++) {
        const pausa = pausas[i];
        const retorno = retornos[i];
        if (pausa && retorno) {
            let diff = toMinutos(retorno) - toMinutos(pausa);
            if (diff < 0) diff += 24 * 60;
            pausaTotal += diff;
        }
    }
    total -= pausaTotal;
    if (total < 0) total = 0;
    const h = String(Math.floor(total / 60)).padStart(2, '0');
    const m = String(total % 60).padStart(2, '0');
    return `${h}:${m}`;
}

// Popup obrigatório ao encerrar trabalho
const endWorkBtn = document.getElementById('endWorkBtn');
if (endWorkBtn) {
    endWorkBtn.onclick = () => {
        addTime('Saída');
        activityCard.style.display = 'block';
        activityDesc.focus();
    };
}

// Torna o campo de atividade obrigatório ao salvar
if (saveActivityBtn) {
    saveActivityBtn.onclick = () => {
        const desc = activityDesc.value.trim();
        if (!desc) {
            activityDesc.classList.add('is-invalid');
            activityDesc.focus();
            return;
        }
        activityDesc.classList.remove('is-invalid');
        dayData.activity = desc;
        localStorage.setItem(todayKey, JSON.stringify(dayData));
        activityCard.style.display = 'none';
        alert('Atividades salvas!');
    };
}

// Toast de sucesso
function showToast(msg = 'Ação realizada com sucesso!') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    toastEl.querySelector('.toast-body').innerHTML = `<i class='bi bi-check-circle-fill me-2'></i> ${msg}`;
    let toast;
    if (window.bootstrap && window.bootstrap.Toast) {
        toast = new window.bootstrap.Toast(toastEl);
    } else if (window.Toast) {
        toast = new window.Toast(toastEl);
    }
    if (toast) toast.show();
}
// Spinner de loading
function showLoading(show = true) {
    console.log(`showLoading chamado com show=${show}`);
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.setProperty('display', show ? 'flex' : 'none', 'important');
        console.log(`Spinner display atualizado para: ${spinner.style.display}`);
    } else {
        console.error('Elemento loadingSpinner não encontrado.');
    }
}
// Exibe toast ao registrar ponto
function addTime(label) {
    try {
        console.log(`addTime iniciado com label=${label}`);
        showLoading(true);
        setTimeout(() => {
            const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            dayData.times.push({ label, time: now });
            localStorage.setItem(todayKey, JSON.stringify(dayData));
            renderLog();
            showToast(label === 'Entrada' ? 'Entrada registrada!' : label === 'Pausa' ? 'Pausa iniciada!' : label === 'Retorno' ? 'Retorno registrado!' : label === 'Saída' ? 'Saída registrada!' : 'Ponto registrado!');
        }, 600);
    } catch (error) {
        console.error('Error in addTime:', error);
        showToast('Ocorreu um erro ao registrar o ponto.');
    } finally {
        console.log('addTime finalizado, ocultando spinner.');
        showLoading(false);
    }
}

if (saveActivityBtn) {
    saveActivityBtn.onclick = () => {
        try {
            console.log('saveActivityBtn clicado.');
            const desc = activityDesc.value.trim();
            if (!desc) {
                activityDesc.classList.add('is-invalid');
                activityDesc.focus();
                return;
            }
            activityDesc.classList.remove('is-invalid');
            showLoading(true);
            setTimeout(() => {
                dayData.activity = desc;
                localStorage.setItem(todayKey, JSON.stringify(dayData));
                activityCard.style.display = 'none';
                showToast('Atividades salvas!');
            }, 600);
        } catch (error) {
            console.error('Error in saveActivityBtn:', error);
            showToast('Ocorreu um erro ao salvar as atividades.');
        } finally {
            console.log('saveActivityBtn finalizado, ocultando spinner.');
            showLoading(false);
        }
    };
}

// Adiciona animação e destaque visual ao histórico
function renderLog() {
    timeLog.innerHTML = '';
    dayData.times.forEach((t, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center gap-2 fade-in';
        let badge = '', icon = '';
        if (t.label === 'Entrada') {
            badge = '<span class="badge bg-success"><i class="bi bi-play-fill"></i> Entrada</span>';
        }
        if (t.label === 'Pausa') {
            badge = '<span class="badge bg-warning text-dark"><i class="bi bi-pause-fill"></i> Pausa</span>';
        }
        if (t.label === 'Retorno') {
            badge = '<span class="badge bg-info text-dark"><i class="bi bi-play-circle"></i> Retorno</span>';
        }
        if (t.label === 'Saída') {
            badge = '<span class="badge bg-danger"><i class="bi bi-stop-fill"></i> Saída</span>';
        }
        li.innerHTML = `${badge} <span class='ms-auto'><i class='bi bi-clock'></i> ${t.time}</span>`;
        timeLog.appendChild(li);
        setTimeout(() => li.classList.add('show'), 100 * idx);
    });
    if (totalHoras) totalHoras.textContent = calcularTotalHoras();
    updateStatus();
}

// Adiciona CSS para animação
const style = document.createElement('style');
style.innerHTML = `
.fade-in { opacity: 0; transform: translateY(10px); transition: all 0.4s; }
.fade-in.show { opacity: 1; transform: translateY(0); }
.list-group-item { font-size: 1.1em; }
`;
document.head.appendChild(style);

// Botões
const startWorkBtn = document.getElementById('startWorkBtn');
const pauseBtn = document.getElementById('pauseBtn');

// Controle de pausa: só pode pausar se estiver trabalhando e não pode pausar duas vezes seguidas
if (pauseBtn) {
    pauseBtn.onclick = () => {
        if (getStatus() === 'Trabalhando') {
            // Impede múltiplas pausas seguidas
            const last = dayData.times[dayData.times.length - 1];
            if (last && last.label === 'Pausa') return;
            addTime('Pausa');
            updateStatus();
        }
    };
}
if (returnPauseBtn) {
    returnPauseBtn.onclick = () => {
        if (getStatus() === 'Em Pausa') {
            const last = dayData.times[dayData.times.length - 1];
            if (last && last.label === 'Retorno') return;
            addTime('Retorno');
            updateStatus();
        }
    };
}
// Controle de entrada: só pode entrar se não houver entrada no dia
if (startWorkBtn) {
    startWorkBtn.onclick = () => {
        // Impede múltiplas entradas no mesmo dia
        if (getStatus() === 'Fora do Expediente' && !dayData.times.some(t => t.label === 'Entrada')) {
            addTime('Entrada');
            updateStatus();
        }
    };
}
// Controle de saída: só pode sair se não saiu ainda
if (endWorkBtn) {
    endWorkBtn.onclick = () => {
        if ((getStatus() === 'Trabalhando' || getStatus() === 'Em Pausa') && !dayData.times.some(t => t.label === 'Saída')) {
            addTime('Saída');
            updateStatus();
            activityCard.style.display = 'block';
            activityDesc.focus();
        }
    };
}

// Ajustando a lógica para exibir o botão 'Painel Admin' apenas uma vez
const token = localStorage.getItem('wtc_token');
if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'admin') {
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        if (adminPanelBtn) {
            adminPanelBtn.classList.remove('d-none');
            adminPanelBtn.onclick = () => window.location.href = '../pages/admin.html';
        }
    }
}

// Função para verificar autenticação no backend
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Falha na autenticação');
        }

        console.log('Autenticação bem-sucedida');
    } catch (error) {
        console.error('Erro de autenticação:', error);
        window.location.href = '../index.html';
    }
}

// Chama a função de autenticação ao carregar a página
checkAuthentication();

// Verifica se o usuário está autenticado e possui o papel correto
function checkDashboardAccess() {
    fetch('http://localhost:3000/dashboard', {
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
        .then(data => {
            console.log('Acesso autorizado:', data);
        })
        .catch(() => {
            alert('Você precisa estar autenticado para acessar esta página.');
            window.location.href = '/index.html';
        });
}

document.addEventListener('DOMContentLoaded', () => {
    checkDashboardAccess();
    // Garante que o spinner seja ocultado após a inicialização
    console.log('Evento window.onload iniciado.');
    try {
        showLoading(false); // Oculta o spinner ao carregar a página
        renderLog();
        updateStatus();
        if (dayData.activity) {
            activityDesc.value = dayData.activity;
        }
        console.log('Evento window.onload concluído com sucesso.');
    } catch (error) {
        console.error('Erro durante a inicialização:', error);
        showToast('Erro ao carregar a página. Por favor, tente novamente.');
        showLoading(false); // Garante que o spinner seja ocultado mesmo em caso de erro
    }
});

// Inicialização
renderLog();
updateStatus();
if (dayData.activity) {
    activityDesc.value = dayData.activity;
}

// Adiciona Google Fonts (Poppins) e Bootstrap Icons
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap';
document.head.appendChild(fontLink);
const iconLink = document.createElement('link');
iconLink.rel = 'stylesheet';
iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
document.head.appendChild(iconLink);

// Adiciona CSS customizado para identidade visual Fire Hosting
const styleFire = document.createElement('style');
styleFire.innerHTML = `
body, .card, .btn, .form-control, .navbar, .list-group-item {
  font-family: 'Poppins', Arial, sans-serif !important;
}
.card, .navbar, .form-control, .btn, .list-group-item {
  border-radius: 1.5rem !important;
}
.card, .navbar {
  box-shadow: 0 4px 24px 0 rgba(220,53,69,0.08), 0 1.5px 6px 0 rgba(0,0,0,0.04) !important;
}
.btn {
  transition: all 0.2s;
}
.btn:hover, .btn:focus {
  opacity: 0.92;
  transform: scale(1.03);
}
.bg-fire {
  background: #dc3545 !important;
  color: #fff !important;
}
.text-fire {
  color: #dc3545 !important;
}
.badge-fire {
  background: #dc3545 !important;
  color: #fff !important;
}
#timeLog .list-group-item {
  margin-bottom: 0.5rem;
  border: none;
  font-size: 1.08em;
  background: #fff;
  box-shadow: 0 2px 8px 0 rgba(220,53,69,0.04);
}
#timeLog .badge {
  font-size: 1em;
  margin-right: 0.5em;
}
`;
document.head.appendChild(styleFire);
