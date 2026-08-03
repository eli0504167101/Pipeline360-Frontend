document.getElementById('lookupForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const queryInput = document.getElementById('lookupQuery');
    const resultDiv = document.getElementById('lookupResult');
    const query = queryInput.value.trim();

    if (!query) {
        resultDiv.innerHTML = '<p class="error-message">יש להזין מספר הזמנה, שם מלא או אימייל.</p>';
        return;
    }

    resultDiv.innerHTML = '<p>מחפש הזמנה...</p>';

    try {
        const response = await fetch(
            `/api/reservations/lookup/${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!response.ok) {
            resultDiv.innerHTML = `
                <p class="error-message">
                    ${data.message || data.error || 'Reservation not found'}
                </p>
            `;
            return;
        }

        const checkIn = new Date(data.checkIn).toLocaleDateString('he-IL');
        const checkOut = new Date(data.checkOut).toLocaleDateString('he-IL');

        resultDiv.innerHTML = `
            <div class="reservation-details">
                <p><strong>מספר הזמנה:</strong> ${data.reservationId}</p>
                <p><strong>שם:</strong> ${data.fullName}</p>
                <p><strong>אימייל:</strong> ${data.email}</p>
                <p><strong>מלון:</strong> ${data.hotelId}</p>
                <p><strong>כניסה:</strong> ${checkIn}</p>
                <p><strong>יציאה:</strong> ${checkOut}</p>
                <button id="cancelBtn" type="button">ביטול הזמנה</button>
            </div>
        `;

        document
            .getElementById('cancelBtn')
            .addEventListener('click', async () => {
                const confirmed = window.confirm(
                    `האם לבטל את ההזמנה ${data.reservationId}?`
                );

                if (!confirmed) {
                    return;
                }

                const deleteResponse = await fetch(
                    `/api/reservations/${encodeURIComponent(data.reservationId)}`,
                    {
                        method: 'DELETE'
                    }
                );

                const deleteResult = await deleteResponse.json();

                if (!deleteResponse.ok) {
                    resultDiv.innerHTML += `
                        <p class="error-message">
                            ${deleteResult.message || 'Reservation cancellation failed'}
                        </p>
                    `;
                    return;
                }

                resultDiv.innerHTML = `
                    <p class="success-message">
                        ההזמנה ${data.reservationId} בוטלה בהצלחה.
                    </p>
                `;
            });
    } catch (error) {
        console.error('Reservation lookup error:', error);

        resultDiv.innerHTML = `
            <p class="error-message">
                אירעה שגיאה בחיפוש ההזמנה.
            </p>
        `;
    }
});