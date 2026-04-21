import { useState } from "react";
import Chatbot from "./components/Chatbot";
import DrugCard from "./components/DrugCard";

export default function App() {
  const [drugData, setDrugData] = useState(null); // set by chatbot when ready

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        Patient Drug & Trial Finder
      </h1>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
        Chat with our AI assistant to get drug recommendations and matching clinical trials.
      </p>

      {/* Step 1: Chatbot collects patient info and returns drug data */}
      <Chatbot onDrugsReady={setDrugData} />

      {/* Step 2: Once chatbot finishes, show drug cards with trial lookup */}
      {drugData && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Recommended FDA-Approved Drugs
          </h2>
          {drugData.drugs.map((drug, i) => (
            <DrugCard key={i} drug={drug} condition={drugData.condition} />
          ))}
        </div>
      )}
    </div>
  );
}
