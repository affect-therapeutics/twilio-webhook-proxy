const axios = require("axios");
const { cloneDeep } = require("lodash");
const { URLSearchParams } = require("url");
const client = require("twilio");
const { getExpectedTwilioSignature } = require("twilio/lib/webhooks/webhooks");

// DESTINATIONS is an array of URLs that will receive a copy of the request with a new
// signature computed for each request.
const DESTINATIONS = [
  "https://api.kustomerapp.com/v1/twilio/webhooks/messages",
  "https://api.iterable.com/twilio/inbound",
];

exports.handler = async function (context, event, callback) {
  try {
    const AUTH_TOKEN = context.AUTH_TOKEN;
    const WEBHOOK_URL = `https://${context.DOMAIN_NAME}${context.PATH}`;
    console.log({ WEBHOOK_URL, AUTH_TOKEN });
    let twiml = new Twilio.twiml.MessagingResponse();
    const body = cloneDeep(event);
    const request = cloneDeep(event.request);
    // remove request
    delete body.request;
    // remove host
    delete request.headers.host;

    const validResponse = client.validateRequest(
      AUTH_TOKEN,
      request.headers["x-twilio-signature"],
      WEBHOOK_URL,
      cloneDeep(body)
    );

    if (!validResponse) {
      console.log("Invalid request HMAC-SHA1 signature");
      return callback("Invalid request HMAC-SHA1 signature");
    } else {
      console.log("Valid request HMAC-SHA1 signature");
    }

    const config = {
      headers: request.headers,
    };

    // COMPUTE NEW HMAC-SHA1
    function headersWithNewSignature(url, body, config) {
      const newSignature = getExpectedTwilioSignature(
        AUTH_TOKEN,
        url,
        cloneDeep(body)
      );
      config.headers["x-twilio-signature"] = newSignature;
      return config;
    }

    Promise.all(
      DESTINATIONS.map(async (url) => {
        const params = new URLSearchParams(cloneDeep(body));
        return await axios.post(
          url,
          params.toString(),
          headersWithNewSignature(url, body, cloneDeep(config))
        );
      })
    )
      .then((result) => {
        console.log("Successfully Proxied Resulting TWIML:", result);
        return callback(null, twiml);
      })
      .catch((err) => {
        console.error(err);
        console.log(
          `//${err.request.host}${err.request.path}`,
          err.response.data
        );
        return callback(err);
      });
  } catch (err) {
    console.log(err);
    return callback(err);
  }
};
