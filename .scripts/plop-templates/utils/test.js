#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const client = require('./client');
const R = require('ramda');

// If modifying these scopes, delete credentials.json.
const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/script.external_request',
  'https://www.googleapis.com/auth/drive',
];
const TOKEN_PATH = 'token.json';
let func = 'myFunction';
let scriptId = '';

const script = google.script({
  version: 'v1',
  auth: client.oAuth2Client
});

const testToRun = process.argv[2];
const family = process.argv[3];
const whichTest = R.cond([
  [R.equals('all'), R.always('testall')],
  [R.equals('family'), R.always('family')],
  [R.T, R.always('testrecent')]
]);

console.log(whichTest(testToRun));

async function runFunction (functionName, scriptId) {
  const res = await script.scripts.run({
    scriptId,
    function: functionName,
    devMode: true,
    resource: {
      parameters: [
        family
      ]
    }
  }, {}, (err, res) => {
    if (err) return console.log(`The API updateContent method returned an error: ${err}`, res);
    if (res.data && res.data.response && res.data.response.result) {
      console.log("-====TESTS====-")
      console.log(res.data.response.result);    
    } else {
      console.log(`ERROR: Tests are not returned.  Please make sure that the function "${functionName}" returns test data.`);
    }
  });
}

// Load client secrets from a local file.
fs.readFile('.clasp.deployments.json', (err, content) => {
  if (err) console.log("You have not run 'clasp create' yet.");

  scriptId = content.toString().split("\n").reduce((response, current, i, arr) => {
    if (i === arr.length - 2) {
      return current.split(" ")[1];
    } else {
      return response;
    }
  }, '');
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Apps Script API.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return client.authenticate(SCOPES)
        .then(c => runFunction(whichTest(testToRun), scriptId))
        .catch(console.error);
      client.setCredentials(JSON.parse(token));
      // callback(oAuth2Client);
      runFunction(whichTest(testToRun), scriptId)
    });

  });

});