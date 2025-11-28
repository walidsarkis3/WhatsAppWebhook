// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Salesforce credentials from environment variables
const sfClientId = process.env.SF_CLIENT_ID;
const sfClientSecret = process.env.SF_CLIENT_SECRET;
const sfUsername = process.env.SF_USERNAME;
const sfPassword = process.env.SF_PASSWORD;
const sfTokenUrl = process.env.SF_TOKEN_URL;

// Function to get Salesforce OAuth token
async function getSalesforceToken() {
  try {
    const response = await axios.post(sfTokenUrl, null, {
      params: {
        grant_type: 'password',
        client_id: sfClientId,
        client_secret: sfClientSecret,
        username: sfUsername,
        password: sfPassword,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('Salesforce OAuth token received:', response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Salesforce token:', error.response?.data || error.message);
    return null;
  }
}

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED by Walid Sarkis');
    res.status(200).send(challenge);

    // Call Salesforce OAuth after responding
    const token = await getSalesforceToken();
    if (token) {
        console.log('Token successfully retrieved and ready for further API calls.');
        // You can make further Salesforce API calls here using the token
    }
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', async(req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
