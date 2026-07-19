const reservationForm = document.getElementById('reservationForm');
const hotelSelect = document.getElementById('hotelSelect');
const hotelDetails = document.getElementById('hotelDetails');
const reservationResult = document.getElementById('reservationResult');

let hotels = [];

async function loadHotels() {
    try {
        const response = await fetch('/api/reservations/hotels');

        if (!response.ok) {
            throw new Error('Failed to load hotels');
        }

        hotels = await response.json();

        hotelSelect.innerHTML = '<option value="">בחר מלון</option>';

        if (hotels.length === 0) {
            hotelSelect.innerHTML =
                '<option value="">לא נמצאו מלונות</option>';
            hotelSelect.disabled = true;
            return;
        }

        hotels.forEach((hotel) => {
            const option = document.createElement('option');

            option.value = hotel.hotelId;
            option.textContent =
                `${hotel.hotelName} - ${hotel.location} - ₪${hotel.pricePerNight} ללילה`;

            hotelSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Hotel loading error:', error);

        hotelSelect.innerHTML =
            '<option value="">שגיאה בטעינת המלונות</option>';

        hotelSelect.disabled = true;
    }
}

hotelSelect.addEventListener('change', () => {
    const selectedHotel = hotels.find(
        (hotel) => hotel.hotelId === hotelSelect.value
    );

    if (!selectedHotel) {
        hotelDetails.innerHTML = '';
        return;
    }

    hotelDetails.innerHTML = `
        <div class="hotel-details">
            <h3>${selectedHotel.hotelName}</h3>
            <p>${selectedHotel.description}</p>
            <p><strong>מיקום:</strong> ${selectedHotel.location}</p>
            <p><strong>מחיר ללילה:</strong> ₪${selectedHotel.pricePerNight}</p>
        </div>
    `;
});

reservationForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const reservationData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        hotelId: hotelSelect.value
    };

    if (!reservationData.hotelId) {
        reservationResult.innerHTML =
            '<p class="error-message">יש לבחור מלון.</p>';
        return;
    }

    if (reservationData.checkOut <= reservationData.checkIn) {
        reservationResult.innerHTML =
            '<p class="error-message">תאריך היציאה חייב להיות אחרי תאריך הכניסה.</p>';
        return;
    }

    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservationData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.details ||
                result.error ||
                'Failed to create reservation'
            );
        }

        reservationResult.innerHTML = `
            <div class="success-message">
                <strong>ההזמנה בוצעה בהצלחה</strong>
                <p>מספר הזמנה: ${result.id}</p>
            </div>
        `;

        reservationForm.reset();
        hotelDetails.innerHTML = '';
    } catch (error) {
        console.error('Reservation error:', error);

        reservationResult.innerHTML = `
            <p class="error-message">
                יצירת ההזמנה נכשלה: ${error.message}
            </p>
        `;
    }
});

loadHotels();