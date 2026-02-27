module.exports = function (config) {
  const event = {
    request: {
      headers: {
        host: "112d-96-255-154-126.ngrok.io",
        "user-agent": "TwilioProxy/1.1",
        "content-length": "558",
        accept: "*/*",
        "content-type": "application/x-www-form-urlencoded",
        "x-home-region": "us1",
        "x-twilio-signature": "xREkkhins+JMgrZeFBc83+yHu4s=",
        "accept-encoding": "gzip",
      },
      cookies: {},
    },
    ToCountry: "US",
    ErrorUrl: "https://112d-96-255-154-126.ngrok.io/proxy",
    ToState: "ME",
    SmsMessageSid: "SMXX",
    ErrorCode: "11200",
    NumMedia: "0",
    ToCity: "PORTLAND",
    FromZip: "20175",
    SmsSid: "SMXX",
    FromState: "VA",
    SmsStatus: "received",
    FromCity: "LEESBURG",
    Body: "Test",
    FromCountry: "US",
    To: "+12065551212",
    MessagingServiceSid: "MGXXX",
    ToZip: "04101",
    NumSegments: "1",
    ReferralNumMedia: "0",
    MessageSid: "SMXX",
    AccountSid: "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    From: "+12065551211",
    ApiVersion: "2010-04-01",
  };
  const context = {
    PATH: "/proxy",
    DOMAIN_NAME: "112d-96-255-154-126.ngrok.io",
    ACCOUNT_SID: "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    AUTH_TOKEN: "cXXXXXXXXXXXX",
    SENTRY_DSN: "",
  };
  const callback = vi.fn();

  return {
    event,
    context,
    callback,
  };
};
