// Firestore-Zugriff fuer Buchungen (Collection "transactions").

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Transaction, TransactionInput } from "./types";

const COLLECTION = "transactions";

function toTransaction(snap: QueryDocumentSnapshot<DocumentData>): Transaction {
  return { id: snap.id, ...(snap.data() as Omit<Transaction, "id">) };
}

// Echtzeit-Abo auf alle Buchungen EINER Immobilie.
// Sortierung nach Datum (neueste zuerst) geschieht clientseitig -> kein
// zusaetzlicher Firestore-Index noetig.
export function subscribeTransactionsForProperty(
  propertyId: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("propertyId", "==", propertyId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(toTransaction);
      list.sort((a, b) => b.date.localeCompare(a.date));
      onData(list);
    },
    (err) => onError?.(err),
  );
}

// Echtzeit-Abo auf ALLE Buchungen (fuer den Jahresabschluss).
// Sortierung/Filterung nach Jahr passiert clientseitig.
export function subscribeAllTransactions(
  onData: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => onData(snap.docs.map(toTransaction)),
    (err) => onError?.(err),
  );
}

export async function addTransaction(input: TransactionInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
