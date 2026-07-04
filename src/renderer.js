// Elements
const btnScan = document.getElementById('btn-scan');
const btnOptimizeAll = document.getElementById('btn-optimize-all');
const btnClearLog = document.getElementById('btn-clear-log');
const consoleOutput = document.getElementById('console-output');

const scoreVal = document.getElementById('score-val');
const scoreVerdict = document.getElementById('score-verdict');
const scoreCircleBar = document.querySelector('.score-circle-bar');

// Card elements
const cards = {
    defender: {
        card: document.getElementById('card-defender'),
        badge: document.querySelector('#card-defender .badge'),
        value: document.getElementById('val-defender'),
        btn: null
    },
    dns: {
        card: document.getElementById('card-dns'),
        badge: document.querySelector('#card-dns .badge'),
        value: document.getElementById('val-dns'),
        btn: document.getElementById('btn-opt-dns')
    },
    sandbox: {
        card: document.getElementById('card-sandbox'),
        badge: document.querySelector('#card-sandbox .badge'),
        value: document.getElementById('val-sandbox'),
        btn: document.getElementById('btn-opt-sandbox')
    },
    wsh: {
        card: document.getElementById('card-wsh'),
        badge: document.querySelector('#card-wsh .badge'),
        value: document.getElementById('val-wsh'),
        btn: document.getElementById('btn-opt-wsh')
    },
    policy: {
        card: document.getElementById('card-policy'),
        badge: document.querySelector('#card-policy .badge'),
        value: document.getElementById('val-policy'),
        btn: document.getElementById('btn-opt-policy')
    }
};

let latestAuditData = null;

// Helpers
function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${msg}`;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

window.onerror = function (message, source, lineno, colno, error) {
    log(`[Lỗi Giao Diện] ${message} (Dòng ${lineno}:${colno})`, 'error');
    return false;
};

function clearLog() {
    consoleOutput.innerHTML = '';
    log('Đã xóa log hệ thống.', 'system');
}

function updateScoreGauge(score) {
    scoreVal.textContent = score;
    
    // Circumference = 2 * PI * r = 2 * 3.14159 * 54 = 339.292
    const circumference = 339.292;
    const offset = circumference - (circumference * score) / 100;
    scoreCircleBar.style.strokeDashoffset = offset;

    // Change circle color based on score
    if (score >= 80) {
        scoreCircleBar.style.stroke = 'var(--accent-green)';
        scoreVerdict.className = 'score-verdict safe';
        scoreVerdict.textContent = 'Hệ Thống An Toàn';
    } else if (score >= 50) {
        scoreCircleBar.style.stroke = 'var(--accent-warning)';
        scoreVerdict.className = 'score-verdict warning';
        scoreVerdict.textContent = 'Cần Cải Thiện';
    } else {
        scoreCircleBar.style.stroke = 'var(--accent-red)';
        scoreVerdict.className = 'score-verdict danger';
        scoreVerdict.textContent = 'Rủi Ro Cao';
    }
}

// Reset Card Styles
function resetCards() {
    Object.values(cards).forEach(c => {
        c.card.className = 'audit-card';
        c.badge.className = 'badge badge-pending';
        c.badge.textContent = 'Chờ kiểm tra';
        c.value.textContent = '--';
        c.value.className = 'meta-value';
        if (c.btn) {
            c.btn.disabled = true;
            c.btn.classList.add('disabled');
        }
    });
    btnOptimizeAll.disabled = true;
    btnOptimizeAll.classList.add('disabled');
}

// Perform Audit Scan
async function performScan() {
    btnScan.disabled = true;
    btnScan.innerHTML = `<svg class="rotating" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Đang Quét...`;
    
    log('Bắt đầu quét cấu hình bảo mật Windows...', 'system');
    resetCards();
    
    try {
        const result = await window.cryptoGuard.runAudit();
        btnScan.disabled = false;
        btnScan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Quét Hệ Thống`;
        
        if (!result.success) {
            log(`Lỗi khi quét hệ thống: ${result.error}`, 'error');
            return;
        }

        const data = result.data;
        latestAuditData = data;
        log('Quét hệ thống hoàn tất. Đang phân tích kết quả...', 'success');
        
        let score = 0;
        let needsOptimization = false;

        // 1. Windows Defender Analysis
        const def = data.defender.realTime;
        cards.defender.value.textContent = def;
        if (def === 'Enabled') {
            score += 25;
            cards.defender.card.classList.add('state-safe');
            cards.defender.badge.className = 'badge badge-safe';
            cards.defender.badge.textContent = 'An toàn';
            cards.defender.value.style.color = 'var(--accent-green)';
            log('Windows Defender Real-time Protection: Đang hoạt động.', 'success');
        } else {
            cards.defender.card.classList.add('state-danger');
            cards.defender.badge.className = 'badge badge-danger';
            cards.defender.badge.textContent = 'Nguy hiểm';
            cards.defender.value.style.color = 'var(--accent-red)';
            log('Windows Defender Real-time Protection: KHÔNG hoạt động! Cảnh báo mã độc hại!', 'error');
        }

        // 2. DNS Security Analysis
        const dns = data.dns;
        cards.dns.value.textContent = dns.configured;
        if (dns.isSecure) {
            score += 25;
            cards.dns.card.classList.add('state-safe');
            cards.dns.badge.className = 'badge badge-safe';
            cards.dns.badge.textContent = 'An toàn';
            cards.dns.value.style.color = 'var(--accent-green)';
            log(`DNS bảo mật đang hoạt động: ${dns.configured}`, 'success');
        } else {
            needsOptimization = true;
            cards.dns.card.classList.add('state-warning');
            cards.dns.badge.className = 'badge badge-warning';
            cards.dns.badge.textContent = 'Cần tối ưu';
            cards.dns.value.style.color = 'var(--accent-warning)';
            cards.dns.btn.disabled = false;
            cards.dns.btn.classList.remove('disabled');
            log(`DNS hiện tại không được bảo mật: ${dns.configured}. Đề xuất cấu hình Cloudflare DNS (1.1.1.2) để chống mã độc.`, 'warn');
        }

        // 3. Windows Sandbox Analysis
        const sb = data.sandbox.status;
        cards.sandbox.value.textContent = sb === 'Enabled' ? 'Đã bật' : (sb === 'Disabled' ? 'Chưa bật' : 'Không hỗ trợ');
        if (sb === 'Enabled') {
            score += 20;
            cards.sandbox.card.classList.add('state-safe');
            cards.sandbox.badge.className = 'badge badge-safe';
            cards.sandbox.badge.textContent = 'Đã bật';
            cards.sandbox.value.style.color = 'var(--accent-green)';
            log('Windows Sandbox: Đang sẵn sàng hoạt động.', 'success');
        } else if (sb === 'Disabled') {
            needsOptimization = true;
            cards.sandbox.card.classList.add('state-warning');
            cards.sandbox.badge.className = 'badge badge-warning';
            cards.sandbox.badge.textContent = 'Chưa bật';
            cards.sandbox.value.style.color = 'var(--accent-warning)';
            cards.sandbox.btn.disabled = false;
            cards.sandbox.btn.classList.remove('disabled');
            log('Windows Sandbox: Chưa được kích hoạt. Bạn nên kích hoạt để chạy thử các file nghi ngờ.', 'warn');
        } else {
            // NotSupported or Unknown
            score += 15; // Give partial score because they can't enable it (Windows Home)
            cards.sandbox.card.classList.add('state-warning');
            cards.sandbox.badge.className = 'badge badge-pending';
            cards.sandbox.badge.textContent = 'Không hỗ trợ';
            cards.sandbox.value.style.color = 'var(--text-muted)';
            log('Windows Sandbox: Phiên bản Windows này không hỗ trợ tính năng Sandbox (Yêu cầu Windows Pro/Ent).', 'info');
        }

        // 4. Windows Script Host Analysis
        const wsh = data.wsh.enabled;
        cards.wsh.value.textContent = wsh ? 'Đang bật' : 'Đã tắt';
        if (!wsh) {
            score += 20;
            cards.wsh.card.classList.add('state-safe');
            cards.wsh.badge.className = 'badge badge-safe';
            cards.wsh.badge.textContent = 'An toàn';
            cards.wsh.value.style.color = 'var(--accent-green)';
            log('Windows Script Host: Đã tắt (Chống các tập tin mã độc .vbs, .js chạy trực tiếp).', 'success');
        } else {
            needsOptimization = true;
            cards.wsh.card.classList.add('state-warning');
            cards.wsh.badge.className = 'badge badge-warning';
            cards.wsh.badge.textContent = 'Cần tối ưu';
            cards.wsh.value.style.color = 'var(--accent-warning)';
            cards.wsh.btn.disabled = false;
            cards.wsh.btn.classList.remove('disabled');
            log('Windows Script Host: Đang bật. Mã độc có thể tự chạy nếu click nhầm file script. Khuyến nghị tắt.', 'warn');
        }

        // 5. PowerShell Policy Analysis
        const pol = data.executionPolicy.policy;
        cards.policy.value.textContent = pol;
        if (pol === 'Restricted' || pol === 'RemoteSigned' || pol === 'AllSigned') {
            score += 10;
            cards.policy.card.classList.add('state-safe');
            cards.policy.badge.className = 'badge badge-safe';
            cards.policy.badge.textContent = 'An toàn';
            cards.policy.value.style.color = 'var(--accent-green)';
            log(`PowerShell Execution Policy: ${pol} (An toàn).`, 'success');
        } else if (pol === 'Unrestricted' || pol === 'Bypass') {
            needsOptimization = true;
            cards.policy.card.classList.add('state-danger');
            cards.policy.badge.className = 'badge badge-danger';
            cards.policy.badge.textContent = 'Nguy hiểm';
            cards.policy.value.style.color = 'var(--accent-red)';
            cards.policy.btn.disabled = false;
            cards.policy.btn.classList.remove('disabled');
            log(`PowerShell Execution Policy: ${pol} (Nguy hiểm! Các script độc hại có thể tự chạy tự do). Khuyến nghị đổi về RemoteSigned.`, 'error');
        } else {
            needsOptimization = true;
            score += 5;
            cards.policy.card.classList.add('state-warning');
            cards.policy.badge.className = 'badge badge-warning';
            cards.policy.badge.textContent = 'Trung bình';
            cards.policy.value.style.color = 'var(--accent-warning)';
            cards.policy.btn.disabled = false;
            cards.policy.btn.classList.remove('disabled');
            log(`PowerShell Execution Policy: ${pol} (Trung bình). Khuyến nghị đổi về RemoteSigned.`, 'warn');
        }

        // Update overall score
        updateScoreGauge(score);

        // Enable "Optimize All" button if there are items to optimize
        if (needsOptimization) {
            btnOptimizeAll.disabled = false;
            btnOptimizeAll.classList.remove('disabled');
        }

    } catch (err) {
        btnScan.disabled = false;
        btnScan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Quét Hệ Thống`;
        log(`Lỗi hệ thống trong quá trình quét: ${err.message}`, 'error');
    }
}

// Perform Optimization Action
async function performOptimize(action) {
    // Disable all actions
    btnScan.disabled = true;
    btnOptimizeAll.disabled = true;
    btnOptimizeAll.classList.add('disabled');
    Object.values(cards).forEach(c => {
        if (c.btn) {
            c.btn.disabled = true;
            c.btn.classList.add('disabled');
        }
    });

    log(`Đang khởi chạy tiến trình tối ưu hóa: [${action}]... Vui lòng đồng ý quyền Administrator (UAC) nếu có thông báo hiển thị.`, 'system');

    try {
        const result = await window.cryptoGuard.runOptimize(action);
        
        if (!result.success) {
            log(`Lỗi tối ưu hóa: ${result.error}`, 'error');
        } else {
            // Write optimization logs
            const logs = result.data;
            if (Array.isArray(logs)) {
                logs.forEach(item => {
                    let logType = 'info';
                    if (item.status === 'SUCCESS') logType = 'success';
                    if (item.status === 'WARNING') logType = 'warn';
                    if (item.status === 'ERROR') logType = 'error';
                    log(`[Tối Ưu] ${item.message}`, logType);
                });
            } else {
                log('Tối ưu hóa hoàn tất.', 'success');
            }
        }
        
        // Re-enable and auto-scan to update scores
        log('Đang tự động quét lại hệ thống để cập nhật trạng thái mới...', 'system');
        await performScan();
        
    } catch (err) {
        log(`Lỗi hệ thống khi tối ưu: ${err.message}`, 'error');
        btnScan.disabled = false;
    }
}

// Event Listeners
btnScan.addEventListener('click', performScan);
btnOptimizeAll.addEventListener('click', () => performOptimize('all'));
btnClearLog.addEventListener('click', clearLog);

if (cards.dns.btn) cards.dns.btn.addEventListener('click', () => performOptimize('dns'));
if (cards.sandbox.btn) cards.sandbox.btn.addEventListener('click', () => performOptimize('sandbox'));
if (cards.wsh.btn) cards.wsh.btn.addEventListener('click', () => performOptimize('wsh'));
if (cards.policy.btn) cards.policy.btn.addEventListener('click', () => performOptimize('policy'));

// Initial message
log('Hệ thống SPL Protect đã sẵn sàng. Vui lòng bấm "Quét Hệ Thống".', 'info');
