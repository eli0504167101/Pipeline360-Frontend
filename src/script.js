document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        hotelId: document.getElementById('hotelSelect').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("Success!");
        } else {
            const err = await response.json();
            alert("Error: " + err.error);
        }
    } catch (err) {
        alert("Server connection failed");
    }
});