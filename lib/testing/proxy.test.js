const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const twilio = require("twilio");

const Proxy = require("../../functions/proxy.protected");
const { stringifyPayload } = require("./stringifyPayload");
const inboundSmsFactory = require("./inboundSmsFactory");
const { before } = require("lodash");

var mock = new MockAdapter(axios);
let consoleErrorSpy;
let consoleWarnSpy;
let consoleLogSpy;
describe("Proxy", () => {
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  test("is a function", () => {
    expect(typeof Proxy.handler).toBe("function");
  });

  test("will send a copy of inbound body to each destination", async () => {
    const successfulDestination = "https://www.good.com";

    const { event, context, callback } = inboundSmsFactory();
    context.DESTINATIONS = [successfulDestination].join(",");

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await Proxy.handler(context, event, callback);

    return expect(stringifyPayload(callback.mock.calls[0])).toEqual([
      null,
      new twilio.twiml.MessagingResponse().toString(),
    ]);
  });

  test("does not forward malformed requests", async () => {
    const successfulDestination = "https://www.good.com";

    const { event, context, callback } = inboundSmsFactory();
    context.DESTINATIONS = [successfulDestination].join(",");

    event.request.headers["x-twilio-signature"] = "bad signature";

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await Proxy.handler(context, event, callback);

    return expect(callback.mock.calls[0]).toEqual([
      "Invalid request HMAC-SHA1 signature",
    ]);
  });

  test("throw error if any destination fails", async () => {
    const successfulDestination = "https://www.good.com";
    const badDestination = "https://www.bad.com";

    const { event, context, callback } = inboundSmsFactory();
    context.DESTINATIONS = [successfulDestination, badDestination].join(",");

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    mock
      .onPost(badDestination)
      .reply(500, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await Proxy.handler(context, event, callback);

    return expect(callback.mock.calls[0][0].message).toEqual(
      "Request failed with status code 500"
    );
  });

  test("validate responses of 'plain' twiml ack", async () => {
    const successfulDestination =
      "https://api.kustomerapp.com/v1/twilio/webhooks/messages";
    const differentResponseDestination = "https://www.bad.com";

    const { event, context, callback } = inboundSmsFactory();
    context.DESTINATIONS = [
      successfulDestination,
      differentResponseDestination,
    ].join(",");

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    mock
      .onPost(differentResponseDestination)
      .reply(200, `<Response></Response>`);

    await Proxy.handler(context, event, callback);
    expect(consoleErrorSpy.mock.calls).toEqual([]);
    expect(consoleLogSpy).toHaveBeenCalledWith("Matching TWIML responses");
    return;
  });

  test("warn if responses contain custom twiml", async () => {
    const successfulDestination =
      "https://api.kustomerapp.com/v1/twilio/webhooks/messages";
    const differentResponseDestination = "https://www.bad.com";

    const { event, context, callback } = inboundSmsFactory();
    context.DESTINATIONS = [
      successfulDestination,
      differentResponseDestination,
    ].join(",");

    mock
      .onPost(successfulDestination)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    mock
      .onPost(differentResponseDestination)
      .reply(200, `<Response><Say message="Hello World!"></Say></Response>`);

    await Proxy.handler(context, event, callback);
    expect(consoleErrorSpy.mock.calls).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "TWIML responses are not the same",
      [
        {
          data: "",
          status: 200,
          url: "https://api.kustomerapp.com/v1/twilio/webhooks/messages",
        },
        { data: { Say: "" }, status: 200, url: "https://www.bad.com" },
      ]
    );
    return;
  });
});
