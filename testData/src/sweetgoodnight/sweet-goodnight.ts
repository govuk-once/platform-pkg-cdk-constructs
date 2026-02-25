export const handler = async () => {
  console.log('someone invoked the lambda, but who?');
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message:
        'And is a goodnight from him, the time is ' +
        new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }),
    }),
  };
};
