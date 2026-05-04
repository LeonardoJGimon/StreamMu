document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step');
    const navItems = document.querySelectorAll('.step-nav__item');
    const alertBoxContainer = document.getElementById('alertBox-container');
    const licenseBoxTemplate = document.createElement('div');
    const setupData = {};

    const showStep = (stepNumber) => {
        steps.forEach(step => step.classList.remove('step--active'));
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) {
            currentStep.classList.add('step--active');
        }

        navItems.forEach(nav => nav.classList.remove('step-nav__item--active'));
        const currentNav = document.getElementById(`nav-step${stepNumber}`);
        if (currentNav) {
            currentNav.classList.add('step-nav__item--active');
        }

        localStorage.setItem('currentInstallerStep', stepNumber);
    };

    const savedStep = localStorage.getItem('currentInstallerStep');
    const initialStep = savedStep ? parseInt(savedStep, 10) : 1;
    showStep(initialStep);

    const showAlert = (type, message) => {
        const iconMap = { success: 'fa-check-circle', danger: 'fa-times-circle', info: 'fa-info-circle' };
        const alertClass = `alert--${type}`;

        alertBoxContainer.innerHTML = '';
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass}`;
        alertDiv.innerHTML = `<i class="fas ${iconMap[type]}"></i><div>${message}</div>`;
        alertBoxContainer.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.style.opacity = '0';
            setTimeout(() => { alertBoxContainer.innerHTML = ''; }, 500);
        }, 5000);
    };

    const renderLicenseBox = (container, licenseInfo) => {
        if (!container) return;

        const active = !!licenseInfo?.active;
        const statusClass = active ? 'active' : 'inactive';
        const statusText = active ? 'Active' : 'Inactive';
        const expires = licenseInfo?.expires || 'N/A';
        const error = licenseInfo?.error || null;

        container.innerHTML = `
            <div class="license-status">
                <div><span>Status</span><span class="status-badge ${statusClass}">${statusText}</span></div>
                <div><span>Expires</span><span>${expires}</span></div>
                ${error ? `<div><span>Error</span><span style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${error}</span></div>` : ''}
            </div>
        `;
    };

    const loadLicenseInfo = async () => {
        const boxes = [
            document.getElementById('license-box-step1'),
            document.getElementById('license-box-step2'),
            document.getElementById('license-box-step3'),
        ];

        if (window.location.protocol === 'file:') {
            boxes.forEach((b) => {
                if (!b) return;
                b.innerHTML = `<div class="license-status"><div><span>License</span><span class="status-badge inactive">N/A</span></div><div><span>Open Setup via server</span><span>http://localhost/Setup/</span></div></div>`;
            });
            return;
        }

        try {
            const res = await fetch('/installation/license-info', { method: 'GET' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.message || `HTTP ${res.status}`);
            }
            boxes.forEach((b) => renderLicenseBox(b, data));
        } catch (e) {
            boxes.forEach((b) => {
                if (!b) return;
                b.innerHTML = `<div class="license-status"><div><span>License</span><span class="status-badge inactive">Error</span></div><div><span>Reason</span><span style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e.message}</span></div></div>`;
            });
        }
    };

    loadLicenseInfo();

    const collectServerData = () => {
        setupData.servers = {};
        const serverBlocks = document.querySelectorAll('#serversContainer .server-block');
        if (serverBlocks.length === 0) { showAlert('danger', 'You must configure at least one game server.'); return false; }

        let allServersValid = true;
        serverBlocks.forEach(block => {
            const key = block.querySelector('[name="key"]').value;
            const displayName = block.querySelector('[name="displayName"]').value;
            if (!key || !displayName) allServersValid = false;
            if(key) {
                const detailsText = block.querySelector('[name="details"]').value;
                const detailsObj = {};
                detailsText.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) { detailsObj[parts[0].trim()] = parts[1].trim(); }
                });
                setupData.servers[key] = {
                    displayName: displayName,
                    connectionRef: key,
                    server_files: block.querySelector('[name="server_files"]').value,
                    server_files_season: parseInt(block.querySelector('[name="server_files_season"]').value, 10),
                    accountDB: block.querySelector('[name="accountDB"]').value,
                    characterDB: block.querySelector('[name="characterDB"]').value,
                    rankingDB: block.querySelector('[name="rankingDB"]').value,
                    eventsDB: block.querySelector('[name="eventsDB"]').value,
                    dashDB: block.querySelector('[name="dashDB"]').value,

                    image: block.querySelector('[name="image"]').value,
                    gameServerName: block.querySelector('[name="gameServerName"]').value,
                    gameServerIp: block.querySelector('[name="gameServerIp"]').value,
                    gameServerPort: parseInt(block.querySelector('[name="gameServerPort"]').value, 10),
                    expRate: block.querySelector('[name="expRate"]')?.value || '',
                    resetType: block.querySelector('[name="resetType"]')?.value || 'Reset',
                    grandreset: !!block.querySelector('[name="grandreset"]')?.checked,
                    version: block.querySelector('[name="version"]')?.value || '',
                    gamesFolder: block.querySelector('[name="gamesFolder"]')?.value || '',
                    downloadUrl: block.querySelector('[name="downloadUrl"]')?.value || '',
                    downloadGoogleDriveUrl: block.querySelector('[name="downloadGoogleDriveUrl"]')?.value || '',
                    details: detailsObj,
                    grandOpeningDate: block.querySelector('[name="grandOpeningDate"]')?.value || '',
                    enabled: true,
                };
            }
        });
        if (!allServersValid) { showAlert('danger', 'Please fill out all required fields for each server.'); return false; }
        return true;
    };

    const collectDbConnections = () => {
        const blocks = document.querySelectorAll('#dbConnectionsContainer .db-connection-block');
        if (blocks.length === 0) return null;

        const dbConfig = {};
        let valid = true;

        blocks.forEach(block => {
            const key = block.querySelector('[name="dbKey"]').value?.trim();
            const server = block.querySelector('[name="dbServer"]').value?.trim();
            const port = parseInt(block.querySelector('[name="dbPort"]').value, 10);
            const user = block.querySelector('[name="dbUser"]').value?.trim();
            const password = block.querySelector('[name="dbPassword"]').value;

            if (!key || !server || !port || !user) valid = false;
            if (!key) return;

            dbConfig[key] = {
                server,
                port,
                user,
                password,
                driver: 'sqlsrv',
                options: { encrypt: false, enableArithAbort: true, requestTimeout: 120000 }
            };
        });

        if (!valid) return { error: 'Please fill all required SQL connection fields.' };
        return dbConfig;
    };

    document.getElementById('testDbAndServersBtn').addEventListener('click', async () => {
        const dbConfig = collectDbConnections();
        if (!dbConfig) { showAlert('danger', 'You must configure at least one SQL connection.'); return; }
        if (dbConfig.error) { showAlert('danger', dbConfig.error); return; }
        if (!collectServerData()) return;

        setupData.useSharedAccountDB = document.getElementById('useSharedAccountDB').checked;
        showAlert('info', 'Testing database connection...');
        try {
            const response = await fetch('/installation/test-db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dbConfig, servers: setupData.servers }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Verification failed.');

            setupData.dbConfig = { ...dbConfig };
            showAlert('success', 'Database connection successful & all databases verified!');
            showStep(2);
        } catch (error) {
            showAlert('danger', `Error: ${error.message}`);
        }
    });

    document.getElementById('confirmGeneralBtn').addEventListener('click', () => {
        setupData.port = parseInt(document.getElementById('app_port').value, 10);

        setupData.frontendURL = document.getElementById('frontend_url').value;

        const emailProvider = document.getElementById('email_provider').value;
        const senderEmail = document.getElementById('email_sender').value;
        const senderName = document.getElementById('email_senderName')?.value;

        setupData.email = {
            provider: emailProvider,
            senderEmail: senderEmail,
            senderName: senderName
        };

        if (emailProvider === 'sendgrid') {
            setupData.email.sendgrid = {
                apiKey: document.getElementById('sendgrid_apiKey').value
            };
        } else if (emailProvider === 'smtp') {
            setupData.email.smtp = {
                host: document.getElementById('smtp_host').value,
                port: parseInt(document.getElementById('smtp_port').value, 10),
                secure: document.getElementById('smtp_secure').checked,
                user: document.getElementById('smtp_user').value,
                pass: document.getElementById('smtp_pass').value,
            };
        } else if (emailProvider === 'mailjet') {
            setupData.email.mailjet = {
                apiKeyPublic: document.getElementById('mailjet_apiKeyPublic')?.value,
                apiKeyPrivate: document.getElementById('mailjet_apiKeyPrivate')?.value,
            };
        }

        setupData.discord = {
            clientID: document.getElementById('discord_clientId').value,
            clientSecret: document.getElementById('discord_clientSecret').value,
            callbackURL: document.getElementById('discord_callback').value
        };

        showAlert('success', 'General settings saved.');
        showStep(3);
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const step = parseInt(item.getAttribute('data-step'), 10);
            if (step === 1 || (step === 2 && setupData.dbConfig) || (step === 3 && setupData.port)) {
                showStep(step);
            }
        });
    });

    const getSeasonRange = (serverFiles) => {
        if (serverFiles === 'MUEMU') return { min: 3, max: 6, default: 6 };
        if (serverFiles === 'MUDEVS') return { min: 6, max: 21, default: 21 };
        return { min: 6, max: 21, default: 21 };
    };

    const buildSeasonOptions = (serverFiles, currentValue) => {
        const range = getSeasonRange(serverFiles);
        const currentSeason = Number.isFinite(parseInt(currentValue, 10)) ? parseInt(currentValue, 10) / 10 : null;

        const selectedSeason = (currentSeason && currentSeason >= range.min && currentSeason <= range.max)
            ? currentSeason
            : range.default;

        const opts = [];
        for (let s = range.min; s <= range.max; s++) {
            const v = s * 10;
            const selectedAttr = s === selectedSeason ? 'selected' : '';
            opts.push(`<option value="${v}" ${selectedAttr}>Season ${s}</option>`);
        }
        return opts.join('');
    };

    let serverIndex = 0;
    const addServerBlock = () => {
        serverIndex++;
        const serverId = `server${serverIndex}`;

        const block = document.createElement('div');
        block.className = 'server-block';
        block.id = `block_${serverId}`;
        const defaultServerFiles = 'IGCN';
        const seasonOptions = buildSeasonOptions(defaultServerFiles, null);

        block.innerHTML = `
            <h5 class="card__header">Server #${serverIndex}</h5>
            <button type="button" class="btn-close" onclick="document.getElementById('block_${serverId}').remove()">&times;</button>

            <h6 class="server-block__category-title">Core Configuration</h6>
            <div class="form-grid">
                <div class="form-group"><label>Unique Key</label><input type="text" class="form-control" name="key" value="server${serverIndex}" readonly required></div>
                <div class="form-group"><label>Display Name</label><input type="text" class="form-control" name="displayName" placeholder="S20 NON-Reset" required></div>
                <div class="form-group"><label>Server Files</label><select class="form-select" name="server_files" required><option value="IGCN">IGCN</option><option value="MUEMU">MUEMU</option><option value="MUDEVS">MUDEVS</option></select></div>
                <div class="form-group"><label>Season</label><select class="form-select" name="server_files_season" required>${seasonOptions}</select></div>
                <div class="form-group"><label>Account DB</label><input type="text" class="form-control" name="accountDB" value="AccountsDB" required></div>
                <div class="form-group"><label>Character DB</label><input type="text" class="form-control" name="characterDB" value="MuOnline" required></div>
                <div class="form-group"><label>Ranking DB</label><input type="text" class="form-control" name="rankingDB" placeholder="IGCN_Ranking" required></div>
                <div class="form-group"><label>Events DB</label><input type="text" class="form-control" name="eventsDB" placeholder="IGCN_Events" required></div>
                <div class="form-group"><label>Dash DB</label><input type="text" class="form-control" name="dashDB" value="DashDB" required></div>
                <div class="form-group"><label>Grand Opening Date (ISO)</label><input type="text" class="form-control" name="grandOpeningDate" placeholder="2026-03-20T20:00:00Z"></div>

                <div class="form-group"><label>Game Server Name</label><input type="text" class="form-control" name="gameServerName" placeholder="GameServer" required></div>
                <div class="form-group"><label>Game Server IP</label><input type="text" class="form-control" name="gameServerIp" value="127.0.0.1" required></div>
                <div class="form-group"><label>Game Server Port</label><input type="number" class="form-control" name="gameServerPort" value="55901" required></div>
                <div class="form-group"><label>Image Path</label><input type="text" class="form-control" name="image" readonly required></div>
            </div>

            <h6 class="server-block__category-title">Gameplay Settings</h6>
            <div class="form-grid">
                <div class="form-group"><label>Experience Rate</label><input type="text" class="form-control" name="expRate" placeholder="100x" required></div>
                <div class="form-group"><label>Reset Type</label><input type="text" class="form-control" name="resetType" value="Reset" placeholder="Reset" required></div>
                <div class="form-group"><label>Grand Reset</label><div class="form-check-group"><input type="checkbox" class="form-check-input" name="grandreset"><label>Enable</label></div></div>
                <div class="form-group"><label>Version</label><input type="text" class="form-control" name="version" placeholder="Casual" required></div>
                <div class="form-group form-group--full-width"><label>Details (one per line, format: KEY=Value)</label><textarea class="form-control" name="details" placeholder="STAT BUILD=Keep Points!\nGR=NO" rows="4"></textarea></div>
            </div>

            <h6 class="server-block__category-title">Client Download</h6>
            <div class="form-grid">
                <div class="form-group"><label>Games Folder</label><input type="text" class="form-control" name="gamesFolder" readonly required></div>
                <div class="form-group form-group--full-width"><label>Download URL Soruce 1</label><input type="text" class="form-control" name="downloadUrl" placeholder="http://example.com/client.zip" required><p class="form-text">Provide a direct download link</p></div>
                <div class="form-group form-group--full-width"><label>Download URL Soruce 2</label><input type="text" class="form-control" name="downloadGoogleDriveUrl" placeholder="https://drive.usercontent.google.com/download?id=1YnyaS5Jhx8CSWg6X2bnWjey9jwXdqQqM" required><p class="form-text">Google Drive</p></div>
            </div>
        `;

        document.getElementById('serversContainer').appendChild(block);

        const keyInput = block.querySelector('[name="key"]');
        const imageInput = block.querySelector('[name="image"]');
        const gamesFolderInput = block.querySelector('[name="gamesFolder"]');
        const serverFilesSelect = block.querySelector('[name="server_files"]');
        const seasonSelect = block.querySelector('[name="server_files_season"]');

        const updateDependentFields = () => {
            const key = keyInput.value;
            imageInput.value = `icon/${key}.png`;
            const match = key.match(/\d*$/);
            if (match) {
                gamesFolderInput.value = `Games${match[0]}`;
            }
        };

        keyInput.addEventListener('input', updateDependentFields);
        updateDependentFields();

        const syncSeasonOptions = () => {
            const selectedFiles = serverFilesSelect.value;
            const currentVal = seasonSelect.value;
            seasonSelect.innerHTML = buildSeasonOptions(selectedFiles, currentVal);
        };

        serverFilesSelect.addEventListener('change', syncSeasonOptions);
        syncSeasonOptions();

        if (dbConnIndex < serverIndex) {
            addDbConnectionBlock();
        }
    };

    let dbConnIndex = 0;
    const addDbConnectionBlock = () => {
        dbConnIndex++;
        const connId = `dbConn${dbConnIndex}`;

        const block = document.createElement('div');
        block.className = 'db-connection-block';
        block.id = `block_${connId}`;
        block.innerHTML = `
            <div class="server-block" style="padding: 1.5rem;">
                <h5 class="card__header">Connection #${dbConnIndex}</h5>
                <button type="button" class="btn-close" onclick="document.getElementById('block_${connId}').remove();">&times;</button>
                <div class="form-grid">
                    <div class="form-group"><label>Key</label><input type="text" class="form-control" name="dbKey" value="server${dbConnIndex}" readonly required></div>
                    <div class="form-group"><label>Server IP/Hostname</label><input type="text" class="form-control" name="dbServer" value="127.0.0.1" required></div>
                    <div class="form-group"><label>Port</label><input type="number" class="form-control" name="dbPort" value="1433" required></div>
                    <div class="form-group"><label>User</label><input type="text" class="form-control" name="dbUser" value="sa" required></div>
                    <div class="form-group"><label>Password</label><input type="password" class="form-control" name="dbPassword" required></div>
                </div>
            </div>
        `;
        document.getElementById('dbConnectionsContainer').appendChild(block);
    };

    document.getElementById('addDbConnectionBtn').addEventListener('click', addDbConnectionBlock);
    addDbConnectionBlock();

    document.getElementById('addServerBtn').addEventListener('click', addServerBlock);
    addServerBlock();

    document.getElementById('setupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const adminUser = document.getElementById('admin_user').value;

        if (!adminUser) { showAlert('danger', 'Admin username is required.'); return; }
        const finalConfig = { ...setupData, admin: { username: adminUser, notes: document.getElementById('admin_notes').value } };
        showAlert('info', 'Finalizing installation...');
        document.querySelector('#step3 button[type="submit"]').disabled = true;
        try {
            const response = await fetch('/installation/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalConfig) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Final installation step failed.');
            showAlert('success', `<strong>Installation Complete!</strong> ${result.message}`);
            localStorage.removeItem('currentInstallerStep');
        } catch (error) {
            showAlert('danger', `Error: ${error.message}`);
            document.querySelector('#step3 button[type="submit"]').disabled = false;
        }
    });

    const emailProviderSelect = document.getElementById('email_provider');
    const handleEmailProviderChange = (event) => {
        const provider = event.target.value;
        document.getElementById('sendgrid-settings').style.display = provider === 'sendgrid' ? 'block' : 'none';
        document.getElementById('smtp-settings').style.display = provider === 'smtp' ? 'block' : 'none';
        const mailjetSettings = document.getElementById('mailjet-settings');
        if (mailjetSettings) {
            mailjetSettings.style.display = provider === 'mailjet' ? 'block' : 'none';
        }
    };

    emailProviderSelect.addEventListener('change', handleEmailProviderChange);
    handleEmailProviderChange({ target: emailProviderSelect });
});