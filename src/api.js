// Cookies remain HttpOnly. User and CSRF state live only in this page's memory.
window.PipelineAPI = (() => {
    let user = null;
    let csrf = null;
    let revision = 0;
    class APIError extends Error {
        constructor(status, message) { super(message); this.status = status; }
    }
    function setUser(value) {
        user = value;
        csrf = null;
        revision++;
        window.dispatchEvent(new CustomEvent('accountchange', { detail: user }));
    }
    async function request(path, { method = 'GET', body, protectedRequest = true, proof = true } = {}) {
        const requestRevision = revision;
        const headers = { Accept: 'application/json' };
        if (method !== 'GET') {
            headers['Content-Type'] = 'application/json';
            if (proof) {
                if (!csrf) {
                    const result = await request('/api/auth/csrf', { proof: false });
                    if (requestRevision !== revision) throw new APIError(409, 'החשבון השתנה. בדקו את מצב ההתחברות ונסו שוב.');
                    csrf = result.csrfToken;
                }
                headers['X-CSRF-Token'] = csrf;
            }
        }
        let response;
        try {
            response = await fetch(path, { method, headers, credentials: 'same-origin', cache: 'no-store',
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
        } catch {
            throw new APIError(0, method === 'GET' ? 'לא ניתן להתחבר לשרת. בדקו את החיבור ונסו שוב.' : 'לא ניתן לאשר שהבקשה הושלמה. בדקו את מצב ההזמנה או החשבון לפני ניסיון נוסף.');
        }
        let data = null;
        if (response.status !== 204) {
            try { data = await response.json(); } catch { /* Proxy/non-JSON errors stay generic. */ }
        }
        if (!response.ok) {
            if (response.status === 401 && protectedRequest && requestRevision === revision) setUser(null);
            if (response.status === 403 && requestRevision === revision) csrf = null;
            const messages = {
                400: 'הנתונים אינם תקינים. בדקו את השדות ואת דרישות הסיסמה.',
                401: protectedRequest ? 'ההתחברות פגה או נדרשת התחברות. התחברו שוב.' : 'האימייל או הסיסמה שגויים.',
                403: 'הבקשה נדחתה מטעמי אבטחה. רעננו את העמוד ובדקו את מצב הבקשה לפני ניסיון נוסף.',
                404: 'ההזמנה לא נמצאה או אינה זמינה לחשבון שלך.',
                409: path === '/api/auth/register' ? 'כתובת האימייל כבר רשומה.' : 'התאריכים אינם זמינים או שקיימת התנגשות בהזמנה.',
                429: 'בוצעו ניסיונות רבים מדי. המתינו לפני ניסיון נוסף.',
                503: 'השירות אינו זמין כרגע. נסו שוב מאוחר יותר.'
            };
            const message = messages[response.status] || 'הבקשה נכשלה.';
            throw new APIError(response.status, message + (method !== 'GET' && response.status >= 500 ? ' בדקו את מצב ההזמנה או החשבון לפני ניסיון נוסף.' : ''));
        }
        if (response.status !== 204 && data === null) throw new APIError(0, 'התקבלה תשובה לא תקינה מהשרת.');
        return data;
    }
    async function restore() {
        const started = revision;
        try {
            const result = await request('/api/auth/me', { protectedRequest: false });
            if (started === revision) setUser(result.user);
        } catch (error) {
            if (started === revision) setUser(null);
            if (error.status !== 401) throw error;
        }
    }
    async function authenticate(mode, fields) {
        const result = await request(`/api/auth/${mode}`, { method: 'POST', body: fields, proof: false, protectedRequest: false });
        setUser(result.user);
        // A rotated cookie must never reuse proof from the previous session.
        const resultProof = await request('/api/auth/csrf');
        csrf = resultProof.csrfToken;
        return user;
    }
    async function logout() {
        const started = revision;
        await request('/api/auth/logout', { method: 'POST', body: {} });
        if (started === revision) setUser(null);
    }
    return { request, restore, authenticate, logout, get user() { return user; }, get revision() { return revision; } };
})();
window.UI = {
    message(container, text, kind = 'error-message') {
        const node = document.createElement('p');
        node.className = kind;
        node.textContent = text;
        container.replaceChildren(node);
    },
    line(container, label, value) {
        const node = document.createElement('p');
        const title = document.createElement('strong');
        title.textContent = `${label}: `;
        node.append(title, document.createTextNode(String(value ?? '')));
        container.append(node);
    }
};
