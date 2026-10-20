const lookupForm = document.getElementById('lookupForm');
const lookupResult = document.getElementById('lookupResult');
let lookupSequence = 0;
window.addEventListener('accountchange', () => { lookupSequence++; });
lookupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const query = document.getElementById('lookupQuery').value.trim();
    if (!PipelineAPI.user) { UI.message(lookupResult, 'יש להתחבר כדי לחפש הזמנה.'); return; }
    if (!query) { UI.message(lookupResult, 'יש להזין מספר הזמנה, שם מלא או אימייל.'); return; }
    const sequence = ++lookupSequence;
    UI.message(lookupResult, 'מחפש הזמנה...', '');
    try {
        const data = await PipelineAPI.request(`/api/reservations/lookup/${encodeURIComponent(query)}`);
        if (sequence !== lookupSequence) return;
        const details = document.createElement('div');
        details.className = 'reservation-details';
        for (const [label, value] of [
            ['מספר הזמנה', data.reservationId], ['שם', data.fullName], ['אימייל', data.email], ['מלון', data.hotelId],
            ['כניסה', new Date(data.checkIn).toLocaleDateString('he-IL')],
            ['יציאה', new Date(data.checkOut).toLocaleDateString('he-IL')]
        ]) UI.line(details, label, value);
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'cancelBtn';
        button.textContent = 'ביטול הזמנה';
        button.addEventListener('click', async () => {
            if (!window.confirm(`האם לבטל את ההזמנה ${data.reservationId}?`)) return;
            button.disabled = true;
            try {
                await PipelineAPI.request(`/api/reservations/${encodeURIComponent(data.reservationId)}`, { method: 'DELETE', body: {} });
                if (sequence === lookupSequence) UI.message(lookupResult, `ההזמנה ${data.reservationId} בוטלה בהצלחה.`, 'success-message');
            } catch (error) {
                if (sequence === lookupSequence || (error.status === 401 && !PipelineAPI.user)) UI.message(lookupResult, error.message);
            } finally { button.disabled = false; }
        });
        details.append(button);
        lookupResult.replaceChildren(details);
    } catch (error) {
        if (sequence === lookupSequence || (error.status === 401 && !PipelineAPI.user)) UI.message(lookupResult, error.message);
    }
});
