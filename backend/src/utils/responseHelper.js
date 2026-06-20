'use strict';

/**
 * Mengembalikan response sukses terstandar.
 * @param {import('express').Response} res
 * @param {object}  data
 * @param {number}  [statusCode=200]
 */
function success(res, messageOrData, dataOrStatusCode = null, statusCode = null) {
  let message = 'Success';
  let data = {};
  let status = 200;

  if (typeof messageOrData === 'string') {
    message = messageOrData;
    if (dataOrStatusCode !== null && typeof dataOrStatusCode === 'object') {
      data = dataOrStatusCode;
      if (typeof statusCode === 'number') status = statusCode;
    } else if (typeof dataOrStatusCode === 'number') {
      status = dataOrStatusCode;
    }
  } else {
    data = messageOrData;
    if (typeof dataOrStatusCode === 'number') status = dataOrStatusCode;
  }

  return res.status(status).json({ success: true, message, data });
}

/**
 * Mengembalikan response error terstandar.
 * @param {import('express').Response} res
 * @param {string}  code        - Error code (e.g. 'DUPLICATE_ORDER')
 * @param {string}  message     - Pesan human-readable
 * @param {number}  [statusCode=400]
 * @param {object}  [details]   - Informasi tambahan (opsional)
 */
function error(res, code, message, statusCode = 400, details = null) {
  const payload = { success: false, error: { code, message } };
  if (details) {
    Object.assign(payload.error, details);
  }
  return res.status(statusCode).json(payload);
}

module.exports = { success, error };
