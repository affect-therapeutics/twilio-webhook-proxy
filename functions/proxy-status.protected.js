const proxyHandler = require("../lib/proxy_handler.js");

// DESTINATIONS is an array of URLs that will receive a copy of the request with a new
// signature computed for each request.
// TODO: Extract to ENV variables
const DESTINATIONS = [
  "https://api.kustomerapp.com/v1/twilio/webhooks/messagestatus",
  "https://api.iterable.com/twilio/statusCallback",
];

exports.handler = proxyHandler(DESTINATIONS);
