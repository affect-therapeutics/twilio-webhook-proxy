const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const twilio = require("twilio");

const Proxy = require("../../functions/proxy-status.protected");
const { stringifyPayload } = require("./stringifyPayload");
const inboundSmsFactory = require("./inboundSmsFactory");

var mock = new MockAdapter(axios);
let consoleErrorSpy;
let consoleLogSpy;
describe("Proxy Status", () => {
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    mock.reset()
  })

  test("is a function", () => {
    expect(typeof Proxy.handler).toBe("function");
  });

  test("will send a copy of inbound body to each destination", async () => {
    const successfulDestination = "https://www.good.com";

    const { event, context, callback } = inboundSmsFactory();
    context.PROXY_STATUS_DESTINATIONS = [successfulDestination].join(",");

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
    context.PROXY_STATUS_DESTINATIONS = [successfulDestination].join(",");

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
    context.PROXY_STATUS_DESTINATIONS = [
      successfulDestination,
      badDestination,
    ].join(",");

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

  test("will send a copy of inbound body only to destinations that match To:", async () => {
    const successfulUrl = "https://www.good.com";
    const successfulDestination = `+12065551212$$${successfulUrl}`;

    const { event, context, callback } = inboundSmsFactory();
    context.PROXY_STATUS_DESTINATIONS = [successfulDestination].join(",");

    mock
      .onPost(successfulUrl)
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?><Response/>`);

    await Proxy.handler(context, event, callback);

    expect(mock.history.post.length).toEqual(1)
    return expect(stringifyPayload(callback.mock.calls[0])).toEqual([
      null,
      new twilio.twiml.MessagingResponse().toString(),
    ]);
  });


  test("will NOT send copy when To: does not match a registered destination", async () => {
    const successfulUrl = "https://www.good.com";
    const successfulDestination = `+15408225121$$${successfulUrl}`;

    const { event, context, callback } = inboundSmsFactory();
    context.PROXY_STATUS_DESTINATIONS = [successfulDestination].join(",");

    mock.onPost(successfulUrl)

    await Proxy.handler(context, event, callback);
    expect(mock.history.post).toEqual([])
  });
});
