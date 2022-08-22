# Twilio Webhook Proxy

[![CircleCI](https://circleci.com/gh/affect-therapeutics/twilio-webhook-proxy/tree/main.svg?style=svg)](https://circleci.com/gh/affect-therapeutics/twilio-webhook-proxy/tree/main)

Use Twilio runtime functions to send a Twilio webhook to multiple destinations.

**This is not affiliated with Twilio in any way.**

## Development

    npm start -- --ngrok

## Deployment

Assuming valid Twilio credentials are provided, in local .env file

    npm deploy

## Diagram

```mermaid
  graph TD;
      Twilio[Twilio SMS Receive]--Signed Webhook-->Proxy;
      Proxy--Signed Webhook-->Kustomer;
      Proxy--Signed Webhook-->Iterable;
```
