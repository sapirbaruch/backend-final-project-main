// src/admin/app.js
const express = require('express');
const connectDb = require('../utils/connect-db');
const { logMiddleware } = require('../utils/logger');
// You might need a Team/User model here if you store developers in DB, 
// OR just hardcode the response as per the requirement usually implies.

const app = express();
app.use(express.json());
app.use(logMiddleware);

app.get('/api/about', (req, res) => {
    const team = [
        { first_name: "mosh", last_name: "israeli" }
    ];
    res.json(team);
});

const PORT = process.env.PORT_ADMIN || 3004;
connectDb().then(() => {
    app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
});

module.exports = app;