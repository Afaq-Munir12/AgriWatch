import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/config";
import { complaints as seedComplaints } from "../data/dummyData";
import {
  COMPLAINTS_TABLE,
  fetchComplaints,
  insertComplaint,
  updateComplaintRow,
  uploadAttachment,
  makeRef,
} from "../supabase/complaintsApi";

// Farmer / public field complaints, stored in Supabase (table: complaints).
//
// Every portal reads from this one provider, so a complaint filed on the
// farmer portal shows up on the PDMA officer portal and the Admin portal
// immediately — Supabase realtime pushes the change, no refresh needed.
//
// If Supabase can't be reached (no .env keys yet, table not created, laptop
// offline during a demo) the provider quietly switches to a localStorage
// mirror so the UI still works. `offline` tells the pages to show a banner.

const STORAGE_KEY = "agriwatch_complaints_v2";
const ComplaintsContext = createContext(null);

// Only used when Supabase is unreachable — keeps the demo populated instead
// of showing an empty table. Real data always comes from Supabase.
function seeded() {
  return seedComplaints.map((c) => ({
    dbId: null,
    role: "farmer",
    phone: "",
    photo: null,
    resolutionNote: "",
    handledBy: "",
    userId: null,
    ...c,
  }));
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to the seed
  }
  return seeded();
}

function writeLocal(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // storage full (big photos) — this session still works in memory
  }
}

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const offlineRef = useRef(false);

  const goOffline = useCallback((err) => {
    offlineRef.current = true;
    setOffline(true);
    setError(err || null);
    setComplaints(readLocal());
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await fetchComplaints();
      offlineRef.current = false;
      setOffline(false);
      setError(null);
      setComplaints(rows);
    } catch (err) {
      console.error("Couldn't load complaints from Supabase:", err);
      goOffline(err);
    } finally {
      setLoading(false);
    }
  }, [goOffline]);

  useEffect(() => {
    load();

    // Realtime: any insert/update from another portal (or the mobile app)
    // triggers a fresh read, which keeps ordering logic in one place.
    const channel = supabase
      .channel("complaints-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: COMPLAINTS_TABLE },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // photo: a File object (preferred) or an already-encoded data URL string.
  async function addComplaint({
    farmer,
    district,
    category,
    description,
    photo = null,
    role = "farmer",
    phone = null,
    userId = null,
  }) {
    let photoUrl = null;
    if (photo instanceof File) {
      photoUrl = await uploadAttachment(photo, "complaints");
    } else if (typeof photo === "string") {
      photoUrl = photo;
    }

    if (!offlineRef.current) {
      try {
        const created = await insertComplaint({
          reporterName: farmer,
          reporterRole: role,
          reporterPhone: phone,
          district,
          category,
          description,
          photoUrl,
          userId,
        });
        setComplaints((prev) =>
          prev.some((c) => c.dbId === created.dbId) ? prev : [created, ...prev]
        );
        return created.id;
      } catch (err) {
        console.error("Couldn't save complaint to Supabase:", err);
        goOffline(err);
      }
    }

    // Offline fallback — same shape, kept in localStorage.
    const local = {
      dbId: null,
      id: makeRef("CMP"),
      farmer,
      role,
      phone: phone || "",
      district,
      category,
      description,
      photo: photoUrl,
      status: "Under Review",
      resolutionNote: "",
      handledBy: "",
      userId,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    setComplaints((prev) => {
      const next = [local, ...prev];
      writeLocal(next);
      return next;
    });
    return local.id;
  }

  async function updateStatus(id, status, resolutionNote, handledBy = "") {
    const target = complaints.find((c) => c.id === id || c.dbId === id);
    if (!target) return;

    const note = resolutionNote === undefined ? target.resolutionNote : resolutionNote;

    // Optimistic — the officer sees the badge flip straight away.
    setComplaints((prev) => {
      const next = prev.map((c) =>
        c.id === target.id ? { ...c, status, resolutionNote: note, handledBy } : c
      );
      if (offlineRef.current) writeLocal(next);
      return next;
    });

    if (offlineRef.current || !target.dbId) return;

    try {
      await updateComplaintRow(target.dbId, {
        status,
        resolution_note: note,
        handled_by: handledBy || target.handledBy || null,
      });
    } catch (err) {
      console.error("Couldn't update complaint in Supabase:", err);
      setError(err);
      load(); // put the real value back on screen
      throw err;
    }
  }

  return (
    <ComplaintsContext.Provider
      value={{ complaints, loading, error, offline, addComplaint, updateStatus, reload: load }}
    >
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const ctx = useContext(ComplaintsContext);
  if (!ctx) throw new Error("useComplaints must be used within ComplaintsProvider");
  return ctx;
}
