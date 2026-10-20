(() => {
    const api = window.PipelineAPI;
    const form = document.getElementById('authForm');
    const dialog = document.getElementById('auth');
    const result = document.getElementById('authResult');
    const status = document.getElementById('accountStatus');
    const submit = document.getElementById('authSubmit');
    const toggle = document.getElementById('switchAuth');
    let registration = false;
    window.addEventListener('accountchange', () => {
        status.textContent = api.user ? `שלום, ${api.user.fullName}` : 'לא מחובר/ת';
        document.getElementById('openAuth').hidden = Boolean(api.user);
        document.getElementById('logoutButton').hidden = !api.user;
        // Never leave another account's reservation details on screen.
        document.getElementById('lookupResult').replaceChildren();
        document.getElementById('reservationResult').replaceChildren();
    });
    toggle.addEventListener('click', () => {
        registration = !registration;
        document.getElementById('registrationName').hidden = !registration;
        document.getElementById('accountName').required = registration;
        document.getElementById('accountPassword').autocomplete = registration ? 'new-password' : 'current-password';
        document.getElementById('auth-title').textContent = registration ? 'הרשמה לחשבון' : 'התחברות לחשבון';
        submit.textContent = registration ? 'הרשמה' : 'התחברות';
        toggle.textContent = registration ? 'כבר יש חשבון? התחברות' : 'אין חשבון? הרשמה';
        result.replaceChildren();
    });
    dialog.addEventListener('close', () => { form.reset(); result.replaceChildren(); });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const password = document.getElementById('accountPassword').value;
        if (new TextEncoder().encode(password).length > 256) {
            UI.message(result, 'הסיסמה ארוכה מדי. יש להשתמש בעד 256 בתים ב־UTF-8.');
            return;
        }
        const fields = { email: document.getElementById('accountEmail').value.trim(), password };
        if (registration) fields.fullName = document.getElementById('accountName').value.trim();
        submit.disabled = toggle.disabled = true;
        try {
            await api.authenticate(registration ? 'register' : 'login', fields);
            dialog.close();
        } catch (error) {
            UI.message(result, error.message);
        } finally {
            document.getElementById('accountPassword').value = '';
            submit.disabled = toggle.disabled = false;
        }
    });
    document.getElementById('logoutButton').addEventListener('click', async event => {
        event.target.disabled = true;
        try { await api.logout(); }
        catch (error) { status.textContent = error.status === 401 ? 'ההתחברות פגה. התחברו שוב.' : `ההתנתקות לא אושרה: ${error.message}`; }
        finally { event.target.disabled = false; }
    });
    api.restore().catch(error => { status.textContent = error.message; });
})();
