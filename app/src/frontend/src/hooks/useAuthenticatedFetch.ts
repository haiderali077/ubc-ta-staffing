import { useAuth } from "../context/AuthContext";

export const useAuthenticatedFetch = () => {
  const { checkForSessionTimeout } = useAuth();

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Ensure credentials are included for authentication
    const fetchOptions: RequestInit = {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const response = await fetch(url, fetchOptions);

    // Check if the response indicates a session timeout
    if (checkForSessionTimeout(response)) {
      // Session timeout has been handled, throw an error to prevent further processing
      throw new Error("Session timed out");
    }

    return response;
  };

  return authenticatedFetch;
};
