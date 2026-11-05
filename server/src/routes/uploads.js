const crypto = require('node:crypto');
const express = require('express');
const ApiError = require('../utils/ApiError');

const uploadFolder = 'neco-insurance';

function createUploadsRouter(cloudinary) {
  const router = express.Router();

  router.post('/sign', (_req, res, next) => {
    if (!cloudinary) {
      return next(new ApiError(503, 'Image uploads are not configured. Set the Cloudinary credentials on the API server.'));
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signUpload({ folder: uploadFolder, timestamp }, cloudinary.apiSecret);
    return res.json({
      data: {
        cloudName: cloudinary.cloudName,
        apiKey: cloudinary.apiKey,
        timestamp,
        folder: uploadFolder,
        signature
      }
    });
  });

  return router;
}

function signUpload(parameters, apiSecret) {
  const canonicalParameters = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${canonicalParameters}${apiSecret}`).digest('hex');
}

module.exports = { createUploadsRouter, signUpload };
