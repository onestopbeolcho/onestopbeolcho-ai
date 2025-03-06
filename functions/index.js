// /onestopbeolcho/functions/index.js
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.options('*', cors());

// /onestopbeolcho/functions/index.js (일부 발췌)
app.get('/geocode', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  try {
    const response = await axios.get(
      `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': 'r6lf8n1n79',
          'X-NCP-APIGW-API-KEY': 'S85lCSwaB3okscfTVwzCy8ZwIy0YZsW7FCLeozuZ',
        },
      }
    );

    if (response.data.addresses && response.data.addresses.length > 0) {
      const { x, y } = response.data.addresses[0];
      await db.collection('graves').add({
        address: query,
        latitude: parseFloat(y),
        longitude: parseFloat(x),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Geocode error:', error.message, error.response?.data);
    res.status(500).json({
      error: 'Failed to fetch geocode data',
      details: error.message,
      apiResponse: error.response?.data || null,
    });
  }
});

exports.api = onRequest(app);

app.get('/direction', async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;
  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({ error: 'All parameters (startLat, startLng, endLat, endLng) are required' });
  }
  try {
    const response = await axios.get(
      `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${startLng},${startLat}&goal=${endLng},${endLat}`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': 'r6lf8n1n79',
          'X-NCP-APIGW-API-KEY': 'S85lCSwaB3okscfTVwzCy8ZwIy0YZsW7FCLeozuZ',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Direction error:', error.message, error.response?.data);
    res.status(500).json({
      error: 'Failed to fetch direction data',
      details: error.message,
      apiResponse: error.response?.data || null,
    });
  }
});

app.get('/places', async (req, res) => {
  const { query, lng, lat } = req.query;
  if (!query || !lng || !lat) {
    return res.status(400).json({ error: 'All parameters (query, lng, lat) are required' });
  }
  try {
    const response = await axios.get(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&start=1&display=5&sort=random&coordinate=${lng},${lat}`,
      {
        headers: {
          'X-Naver-Client-Id': 'r6lf8n1n79',
          'X-Naver-Client-Secret': 'S85lCSwaB3okscfTVwzCy8ZwIy0YZsW7FCLeozuZ',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Places error:', error.message, error.response?.data);
    res.status(500).json({
      error: 'Failed to fetch places data',
      details: error.message,
      apiResponse: error.response?.data || null,
    });
  }
});

exports.api = onRequest(app);