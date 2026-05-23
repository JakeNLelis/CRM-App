import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { http } from "../lib/api";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user || user === false) return;
    try {
      const [c, co, d, a, au, u] = await Promise.all([
        http.get("/companies"),
        http.get("/contacts"),
        http.get("/deals"),
        http.get("/activities"),
        http.get("/automations"),
        http.get("/users"),
      ]);
      setCompanies(c.data);
      setContacts(co.data);
      setDeals(d.data);
      setActivities(a.data);
      setAutomations(au.data);
      setUsers(u.data);
      setLoaded(true);
    } catch (e) {
      console.error("Data fetch error", e);
    }
  }, [user]);

  useEffect(() => {
    if (user && user !== false) fetchAll();
  }, [user, fetchAll]);

  // Lookups
  const lookups = useMemo(() => {
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    return {
      companyById: byId(companies),
      contactById: byId(contacts),
      userById: byId(users),
      dealById: byId(deals),
    };
  }, [companies, contacts, users, deals]);

  return (
    <DataContext.Provider
      value={{
        companies, setCompanies,
        contacts, setContacts,
        deals, setDeals,
        activities, setActivities,
        automations, setAutomations,
        users, setUsers,
        loaded,
        fetchAll,
        lookups,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
