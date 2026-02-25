export const handler = async () => {
  console.log('someone invoked the lambda, but who?');
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message:
        'Hello to GDS from a new repo, the time is ' +
        new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }),
    }),
  };
};
