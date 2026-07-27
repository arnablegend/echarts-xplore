import { useState } from "react";

type HelloWorldResponse = {
  message: string;
};

export default function App() {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function getHelloWorld(): Promise<void> {
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/hello_world");

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data: HelloWorldResponse = await response.json();
      setMessage(data.message);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred",
      );
    }
  }

  return (
    <main>
      <h1>React + FastAPI</h1>
      <button type="button" onClick={getHelloWorld}>
        Get greeting
      </button>
      {message && <p>{message}</p>}
      {error && <p role="alert">Unable to reach the server: {error}</p>}
    </main>
  );
}
