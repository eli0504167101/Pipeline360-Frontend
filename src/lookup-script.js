document.getElementById('lookupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('lookupQuery').value;
    const resultDiv = document.getElementById('lookupResult');

    try {
        const response = await fetch(`/api/reservations/lookup/${query}`);
        
        if (response.ok) {
            const data = await response.json();
            resultDiv.innerHTML = `
                <p>Found: ${data.fullName} - ${data.checkIn}</p>
                <button id="cancelBtn">Cancel Reservation</button>
            `;

            // הוספת Event Listener למחיקה
            document.getElementById('cancelBtn').addEventListener('click', async () => {
                const delRes = await fetch(`/api/reservations/${data._id}`, { method: 'DELETE' });
                if (delRes.ok) {
                    alert('Reservation cancelled!');
                    resultDiv.innerHTML = '';
                }
            });
        } else {
            resultDiv.innerHTML = '<p>Reservation not found.</p>';
        }
    } catch (err) {
        console.error('Error:', err);
    }
});