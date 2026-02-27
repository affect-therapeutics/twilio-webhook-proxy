const axios = require("axios");
const { cloneDeep } = require("lodash");
const { URLSearchParams } = require("url");
const twilio = require("twilio");
const { getExpectedTwilioSignature } = require("twilio/lib/webhooks/webhooks");
const { XMLParser } = require("fast-xml-parser");

// Helpers
function destinations(context) {
  let DESTINATIONS;
  if (context.PROXY_DESTINATIONS) {
    DESTINATIONS = context.PROXY_DESTINATIONS.split(",").filter(
      (url) => url.length > 0
    );
  } else {
    DESTINATIONS = [
      "https://api.kustomerapp.com/v1/twilio/webhooks/messages",
      "https://api.iterable.com/twilio/inbound",
    ];
  }
  return DESTINATIONS;
}

// Prepare error handling
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.SENTRY_TRACE_SAMPLE_RATE || 0,
});

exports.handler = async function (context, event, callback) {
  console.log("Event:", JSON.stringify(event));
  const transaction = Sentry.startInactiveSpan({
    op: "HandleIncomingTwilioWebhook",
    name: "HandleIncomingTwilioWebhook",
  });
  Sentry.setContext("event", {
    event: event,
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

    // Payload now matches original request

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

    // Warning
    // Destinations list is a ORDERED list, and will be called in order, waiting for each response before calling the next one  THIS IS INTENTIONAL, to prevent race conditions between destinations such as a destination that deletes media from Twillio

    const destinationsList = destinations(context);
    const responses = [];

    for (const url of destinationsList) {
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
      responses.push(result);
    }

    const parser = new XMLParser();
    const twimlResponses = new Set(
      // Fetch "Response section of TWIML ack and validate that all destinations are sending the same response
      responses.map((response) => parser.parse(response.data)["Response"])
    );

    if (twimlResponses.size !== 1) {
      const reseponsesForDisplay = responses.map((response) => {
        return {
          url: response.request.responseURL,
          status: response.status,
          data: parser.parse(response.data)["Response"],
        };
      });
      console.warn("TWIML responses are not the same", reseponsesForDisplay);
      Sentry.withScope(function (scope) {
        scope.setExtra("responses", reseponsesForDisplay);
        Sentry.captureMessage("TWIML responses are not the same", "warn");
      });
    } else {
      console.log("Matching TWIML responses");
    }

    return callback(null, twiml);
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);

    return callback(err);
  } finally {
    transaction.end();
  }
};
