// Reads the latest sign-in code for EMAIL from the local Mailpit API.
const res = http.get(
  `http://127.0.0.1:58025/api/v1/search?query=${encodeURIComponent(`to:"${EMAIL}"`)}`,
);
const messages = json(res.body).messages || [];
const match = messages.length ? /^(\d{6}) /.exec(messages[0].Subject) : null;
if (!match) throw new Error(`no code for ${EMAIL}`);
output.code = match[1];
