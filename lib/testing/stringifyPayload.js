function stringifyPayload([err, payload]) {
  if (payload) {
    payload = payload.toString();
  }

  return [err, payload];
}
exports.stringifyPayload = stringifyPayload;
