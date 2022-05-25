const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const twilio = require("twilio");

const ProxyHandler = require("./proxy_handler");
const { stringifyPayload } = require("./testing/stringifyPayload");
const inboundSmsFactory = require("./testing/inboundSmsFactory");

var mock = new MockAdapter(axios);
describe("ProxyHandler", () => {
  test(" is a function", () => {
    expect(typeof ProxyHandler).toBe("function");
  });

  test("returns a function", () => {
    expect(typeof ProxyHandler([])).toBe("function");
  });

  test("will send a copy of inbound body to each destination", async () => {
    const successfulDestination = "https://www.good.com";
    handler = ProxyHandler([successfulDestination]);

    const { event, context, callback } = inboundSmsFactory();

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await handler(context, event, callback);

    return expect(stringifyPayload(callback.mock.calls[0])).toEqual([
      null,
      new twilio.twiml.MessagingResponse().toString(),
    ]);
  });

  test("does not forward malformed requests", async () => {
    const successfulDestination = "https://www.good.com";
    handler = ProxyHandler([successfulDestination]);

    const { event, context, callback } = inboundSmsFactory();

    event.request.headers["x-twilio-signature"] = "bad signature";

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await handler(context, event, callback);

    return expect(callback.mock.calls[0]).toEqual([
      "Invalid request HMAC-SHA1 signature",
    ]);
  });

  test("throw error if any destination fails", async () => {
    const successfulDestination = "https://www.good.com";
    const badDestination = "https://www.bad.com";
    handler = ProxyHandler([successfulDestination, badDestination]);

    const { event, context, callback } = inboundSmsFactory();

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    mock
      .onPost(badDestination)
      .reply(500, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await handler(context, event, callback);

    return expect(callback.mock.calls[0][0].message).toEqual(
      "Request failed with status code 500"
    );
  });
});
