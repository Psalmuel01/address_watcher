import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryContextProvider } from "./context/QueryContext";
import { ApolloProvider } from "@apollo/client";
import { client } from "./config/apollo-client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <QueryContextProvider>
        <App />
      </QueryContextProvider>
    </ApolloProvider>
  </React.StrictMode>
);