// Import
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Create an Express app
const app = express();

// Load private key
const jwtPrivateKey = process.env.JWT_PRIVATE;

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;

// Token used to verify the webhook endpoint with the GET request
const verifyToken = process.env.VERIFY_TOKEN;

// Salesforce credentials from environment variables
const sfClientId = process.env.SF_CLIENT_ID;
const sfUsername = process.env.SF_USERNAME;
const sfTokenUrl = process.env.SF_TOKEN_URL;
const sfTokenAud = process.env.SF_TOKEN_AUD;

// Function to get Salesforce OAuth token
async function getSalesforceToken() {
  
  try {

    const assertionToken = getAssertionToken();

    const response = await axios.post(
      sfTokenUrl,
      new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: assertionToken
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    //console.log("Salesforce Access Token:", response.data.access_token);
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
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', async(req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  //console.log(`\n\nWebhook received ${timestamp}\n`);
  //console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();

  // Call Salesforce OAuth after responding
  const token = await getSalesforceToken();
  if (token) {
    sendWhatsAppMessageToSalesforceApiCall(token,req.body);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});

function getAssertionToken() {

    // Build the JWT payload
    const payload = {
      iss: sfClientId, // Consumer Key
      sub: sfUsername, 
      aud: sfTokenAud,        
      exp: Math.floor(Date.now() / 1000) + 180    // 3 min expiry
    };

    // Sign the JWT (RS256)
    const assertion = jwt.sign(payload, jwtPrivateKey, { algorithm: 'RS256' });
    //console.log('assertion : ' +  assertion);
    return assertion;
}

async function sendWhatsAppMessageToSalesforceApiCall(token,messagePayload) {

  try {
    var sfInstanceUrl = 'https://orgfarm-767e662db4-dev-ed.develop.my.salesforce.com';
    const response = await axios.post(
      `${sfInstanceUrl}/services/apexrest/WA/Message`,
      messagePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Apex response:", response.data);
    return response.data;
    
  } catch (err) {
    
    console.error("Error calling Apex endpoint:", err.response?.data || err.message);
    throw err;
  }
}
