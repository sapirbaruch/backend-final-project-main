const express = require('express');
const router = express.Router();

// Import from the correct controllers
const { addExpense, getReport, removeExpense, removeReport } = require('../controllers/expense-controller');
const { createUser, getUserDetails, getUsers, removeUser } = require('../controllers/user-controller');

// Note: Ensure you have this file or remove these lines if you merged purge logic into the controllers above
// const { removeUsers, removeExpenses, removeReports } = require('../controllers/purge-controller');

// Define the developers array with correct keys (first_name, last_name)
const developers = [
  {
    first_name: 'Sapir',
    last_name: 'Baruch',
    id: process.env.SAPIR_ID,
    email: 'sapirbaruch01@gmail.com'
  },
  {
    first_name: 'Ofir',
    last_name: 'Hafif',
    id: process.env.OFIR_ID,
    email: 'ofir135001@gmail.com'
  },
  {
    first_name: 'Israel',
    last_name: 'Mahari',
    id: process.env.ISRAEL_ID,
    email: 'israelmahari00@gmail.com'
  }
];

// --- Application Routes ---
router.get('/report', getReport);       // was getAllExpenses
router.post('/addcost', addExpense);
router.post('/adduser', createUser);
router.get('/users/:id', getUserDetails); // Requirement: Get specific user
router.get('/users', getUsers);           // Requirement: List users
router.get('/about', (req, res) => {
  res.json(developers);
});

// --- Test Cleanup Routes ---
router.delete('/removeuser', removeUser);
router.delete('/removereport', removeReport);
router.delete('/removecost', removeExpense);


module.exports = router;