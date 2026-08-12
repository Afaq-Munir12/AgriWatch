import { createContext, useContext, useEffect, useState } from "react";
import { complaints as seedComplaints } from "../data/dummyData";

const STORAGE_KEY = "agriwatch_complaints_v1";
const ComplaintsContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed data
  }
  // Seed data doesn't have photos/notes — normalize shape so every
  // complaint has the same fields regardless of source.
  return seedComplaints.map((c) => ({
    photo: null,
    resolutionNote: "",
    ...c,
  }));
}

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
    } catch {
      // localStorage full (large photos) — data still works for this session
    }
  }, [complaints]);

  function addComplaint({ farmer, district, category, description, photo }) {
    const id = `CMP-${500 + complaints.length + 1}-${Date.now().toString().slice(-4)}`;
    const newComplaint = {
      id,
      farmer,
      district,
      category,
      description,
      photo: photo || null,
      status: "Under Review",
      resolutionNote: "",
      date: new Date().toISOString().slice(0, 10),
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    return id;
  }

  function updateStatus(id, status, resolutionNote = "") {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status, resolutionNote: resolutionNote || c.resolutionNote }
          : c
      )
    );
  }

  return (
    <ComplaintsContext.Provider value={{ complaints, addComplaint, updateStatus }}>
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintsContext);
  if (!ctx) throw new Error("useComplaints must be used within ComplaintsProvider");
  return ctx;
}
