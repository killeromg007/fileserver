const express = require('express');
const serverless = require('serverless-http');
const app = require('../../app');

// Wrap your Express app with serverless
module.exports.handler = serverless(app);
