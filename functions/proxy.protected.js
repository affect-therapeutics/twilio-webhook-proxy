const proxyHandler = require("../lib/proxy_handler.js");

// DESTINATIONS is an array of URLs that will receive a copy of the request with a new
// signature computed for each request.
const DESTINATIONS = [
  "https://api.kustomerapp.com/v1/twilio/webhooks/messages",
  "https://api.iterable.com/twilio/inbound",
];

exports.handler = proxyHandler(DESTINATIONS);
