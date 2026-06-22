const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
    res.json({ status: "ok", message: "Backend is running!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});