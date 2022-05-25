const axios = require("axios");
const { cloneDeep } = require("lodash");
const { URLSearchParams } = require("url");
const twilio = require("twilio");
const { getExpectedTwilioSignature } = require("twilio/lib/webhooks/webhooks");

const Sentry = require("./sentry");

const proxyHandler = (destinations) => {
  return async function (context, event, callback) {
    const transaction = Sentry.startTransaction({
      name: "HandleIncomingTwilioWebhook",
    });
    try {
      const AUTH_TOKEN = context.AUTH_TOKEN;
      const WEBHOOK_URL = `https://${context.DOMAIN_NAME}${context.PATH}`;

      let twiml = new twilio.twiml.MessagingResponse();
      const body = cloneDeep(event);
      const request = cloneDeep(event.request);
      // remove request
      delete body.request;
      // remove host
      delete request.headers.host;

      const validResponse = twilio.validateRequest(
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

      responses = await Promise.all(
        destinations.map(async (url) => {
          console.log(`Sending to ${url}`);
          const params = new URLSearchParams(cloneDeep(body));
          const result = await axios.post(
            url,
            params.toString(),
            headersWithNewSignature(url, body, cloneDeep(config))
          );
          console.log(
            `Sent ${url} Proxied Resulting TWIML:`,
            JSON.stringify(result.data)
          );
          return result;
        })
      );
      return callback(null, twiml);
    } catch (err) {
      console.error(err);
      Sentry.captureException(err);

      return callback(err);
    } finally {
      transaction.finish();
    }
  };
};

module.exports = proxyHandler;
