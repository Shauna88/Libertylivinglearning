"use client";

export default function PrintButton() {
  return (
    <button className="btn btn-primary noprint" onClick={() => window.print()}>
      <span className="ms" style={{ fontSize: 17 }}>
        print
      </span>
      Print / save as PDF
    </button>
  );
}
