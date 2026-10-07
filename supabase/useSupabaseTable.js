import { useEffect, useState } from "react";
import { supabase } from "./config";

// Reads a Supabase table and keeps it live with Postgres Realtime.
// Each hook instance gets its own unique channel name so multiple admin pages
// can safely observe the same table without reusing an already-subscribed
// Realtime channel (important in React StrictMode too).
export function useSupabaseTable(tableName, orderByField = "created_at") {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    async function fetchRows() {
      try {
        let query = supabase.from(tableName).select("*");
        if (orderByField) {
          query = query.order(orderByField, { ascending: false });
        }

        const { data: rows, error: err } = await query;
        if (cancelled) return;

        if (err) {
          console.error(`Supabase error reading "${tableName}":`, err);
          setError(err);
        } else {
          setData(rows ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`Supabase error reading "${tableName}":`, err);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRows();

    // Never reuse a channel topic. The previous implementation used only
    // `${tableName}-changes`; when AdminPortalLayout and a child page both
    // requested the same table, Supabase could see an already-subscribed topic
    // and throw: "cannot add postgres_changes callbacks ... after subscribe()".
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`${tableName}-changes-${uniqueId}`);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: tableName },
      () => {
        if (!cancelled) fetchRows();
      }
    );

    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`Realtime channel problem for "${tableName}":`, status);
      }
    });

    return () => {
      cancelled = true;
      // removeChannel is async; a unique channel name means StrictMode can
      // remount immediately without colliding with the channel being removed.
      void supabase.removeChannel(channel);
    };
  }, [tableName, orderByField]);

  return { data, loading, error };
}
