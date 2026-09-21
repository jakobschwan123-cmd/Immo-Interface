// Firestore-Zugriff fuer Immobilien (Collection "properties").
// Wir nutzen ein GEMEINSAMES Datenmodell: alle freigeschalteten Nutzer
// (du + Eltern) sehen und bearbeiten dieselben Immobilien. Die verbindliche
// Zugriffssperre kommt ueber die Firestore Security Rules (firestore.rules).

import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Property, PropertyInput } from "./types";

const COLLECTION = "properties";

// Firestore-Dokument -> typisiertes Property-Objekt.
function toProperty(snap: QueryDocumentSnapshot<DocumentData>): Property {
  const data = snap.data();
  return { id: snap.id, ...(data as Omit<Property, "id">) };
}

// Echtzeit-Abo auf alle Immobilien. Ruft callback bei jeder Aenderung auf.
// Gibt eine Funktion zum Beenden des Abos zurueck (im useEffect aufraeumen!).
export function subscribeProperties(
  onData: (properties: Property[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(toProperty)),
    (err) => onError?.(err),
  );
}

// Echtzeit-Abo auf EINE Immobilie (fuer die Detailseite).
// onData bekommt null, wenn das Dokument nicht existiert.
export function subscribeProperty(
  id: string,
  onData: (property: Property | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, COLLECTION, id),
    (snap) =>
      onData(
        snap.exists()
          ? ({ id: snap.id, ...(snap.data() as Omit<Property, "id">) })
          : null,
      ),
    (err) => onError?.(err),
  );
}

// Neue Immobilie anlegen. createdAt setzt der Server.
export async function addProperty(input: PropertyInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Immobilie aktualisieren (Teilfelder).
export async function updateProperty(
  id: string,
  patch: Partial<PropertyInput>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), patch);
}

// Immobilie loeschen.
export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
