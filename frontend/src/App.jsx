import { useState } from "react";

export default function App() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function getHelloWorld() {
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/hello_world");

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
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
