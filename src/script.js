const reservationForm = document.getElementById('reservationForm');
const hotelSelect = document.getElementById('hotelSelect');
const hotelDetails = document.getElementById('hotelDetails');
const reservationResult = document.getElementById('reservationResult');
let hotels = [];

async function loadHotels() {
    try {
        hotels = await PipelineAPI.request('/api/reservations/hotels', { protectedRequest: false });
        hotelSelect.replaceChildren(new Option(hotels.length ? 'בחר מלון' : 'לא נמצאו מלונות', ''));
        hotelSelect.disabled = hotels.length === 0;
        hotels.forEach(hotel => hotelSelect.append(new Option(
            `${hotel.hotelName} - ${hotel.location} - ₪${hotel.pricePerNight} ללילה`, hotel.hotelId)));
    } catch {
        hotelSelect.replaceChildren(new Option('שגיאה בטעינת המלונות', ''));
        hotelSelect.disabled = true;
    }
}
hotelSelect.addEventListener('change', () => {
    hotelDetails.replaceChildren();
    const hotel = hotels.find(item => item.hotelId === hotelSelect.value);
    if (!hotel) return;
    const details = document.createElement('div');
    details.className = 'hotel-details';
    const title = document.createElement('h3');
    title.textContent = hotel.hotelName;
    details.append(title);
    UI.line(details, 'תיאור', hotel.description);
    UI.line(details, 'מיקום', hotel.location);
    UI.line(details, 'מחיר ללילה', `₪${hotel.pricePerNight}`);
    hotelDetails.append(details);
});
reservationForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!PipelineAPI.user) { UI.message(reservationResult, 'יש להתחבר לפני יצירת הזמנה.'); return; }
    const data = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        hotelId: hotelSelect.value
    };
    if (!data.hotelId || data.checkOut <= data.checkIn) {
        UI.message(reservationResult, 'בחרו מלון ותאריך יציאה מאוחר מתאריך הכניסה.'); return;
    }
    const button = reservationForm.querySelector('[type="submit"]');
    const revision = PipelineAPI.revision;
    button.disabled = true;
    try {
        const result = await PipelineAPI.request('/api/reservations', { method: 'POST', body: data });
        if (revision !== PipelineAPI.revision) return;
        UI.message(reservationResult, `ההזמנה בוצעה בהצלחה. מספר הזמנה: ${result.reservationId}`, 'success-message');
        reservationForm.reset();
        hotelDetails.replaceChildren();
    } catch (error) { UI.message(reservationResult, error.message); }
    finally { button.disabled = false; }
});
loadHotels();
