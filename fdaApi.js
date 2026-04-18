// openFDA drug label API — free, no API key required
// Docs: https://open.fda.gov/apis/drug/label/

const FDA_BASE = "https://api.fda.gov/drug/label.json";

/**
 * Search FDA drug labels by condition/indication.
 * Returns an array of simplified drug objects ready for display.
 */
export async function searchDrugsByCondition(condition) {
  try {
    // Search the "indications_and_usage" field for the condition
    const params = new URLSearchParams({
      search: `indications_and_usage:"${condition}"`,
      limit: 8,
    });

    const res = await fetch(`${FDA_BASE}?${params}`);
    if (!res.ok) throw new Error(`FDA API error: ${res.status}`);
    const json = await res.json();

    if (!json.results || json.results.length === 0) {
      return [];
    }

    // Parse each FDA label result into a clean object
    return json.results
      .map((label) => {
        const brandName =
          label.openfda?.brand_name?.[0] ||
          label.openfda?.generic_name?.[0] ||
          null;

        const genericName = label.openfda?.generic_name?.[0] || null;
        const manufacturer = label.openfda?.manufacturer_name?.[0] || null;
        const drugClass = label.openfda?.pharm_class_epc?.[0] || null;

        // Get the first 300 chars of indications text
        const indications = label.indications_and_usage?.[0]
          ?.replace(/\s+/g, " ")
          .trim()
          .slice(0, 300) || null;

        const warnings = label.warnings?.[0]
          ?.replace(/\s+/g, " ")
          .trim()
          .slice(0, 200) || null;

        const dosage = label.dosage_and_administration?.[0]
          ?.replace(/\s+/g, " ")
          .trim()
          .slice(0, 200) || null;

        // Skip results with no usable name
        if (!brandName && !genericName) return null;

        return {
          name: brandName
            ? `${brandName}${genericName && genericName !== brandName ? ` (${genericName})` : ""}`
            : genericName,
          tag: drugClass || "FDA approved",
          manufacturer: manufacturer || "—",
          indications,
          warnings,
          dosage,
          // Raw fields passed to Gemini for plain-English summarization
          rawLabel: { brandName, genericName, drugClass, indications },
        };
      })
      .filter(Boolean) // remove nulls
      .filter(
        // deduplicate by generic name
        (drug, index, self) =>
          index ===
          self.findIndex(
            (d) =>
              d.rawLabel.genericName === drug.rawLabel.genericName
          )
      )
      .slice(0, 4); // return max 4 drugs
  } catch (err) {
    console.error("FDA API error:", err);
    return [];
  }
}

/**
 * Ask Gemini to write a plain-English 2-sentence description
 * for a drug given its raw FDA label data.
 * Called once per drug after FDA results come back.
 */
export async function summarizeDrugWithGemini(drug, condition, apiKey) {
  const prompt = `You are a medical writer. Given this FDA label data for a drug, write exactly 2 clear, plain-English sentences explaining what this drug does and why a patient with ${condition} might be prescribed it. Be concise and empathetic. Do not mention brand names vs generic — just explain the drug.

Drug name: ${drug.rawLabel.brandName || drug.rawLabel.genericName}
Drug class: ${drug.rawLabel.drugClass || "unknown"}
FDA indications text: ${drug.rawLabel.indications || "not available"}

Respond with just the 2 sentences, nothing else.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 150 },
        }),
      }
    );
    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      drug.indications ||
      "FDA-approved medication for this condition."
    );
  } catch {
    return drug.indications || "FDA-approved medication for this condition.";
  }
}
