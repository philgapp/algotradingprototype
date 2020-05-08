// This is the AirTable Config file used by airtable.js
// TODO pull API key and base from user table

const Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'keyOpXdzxlE4OloHX' // This is the prototype development key only!
});

module.exports = Airtable
