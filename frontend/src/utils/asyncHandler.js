/**
 * Helper to safely await promises without using try...catch
 * Returns [data, error]
 */
export const safeApiCall = async (promise) => {
  return promise
    .then(data => [data, null])
    .catch(error => [null, error]);
};
