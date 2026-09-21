// Firestore-Zugriff fuer Rechtsträger (Collection "entities").
// Gleiches gemeinsames Haushaltsmodell wie bei den Immobilien.

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
import type { Entity, EntityInput } from "./types";

const COLLECTION = "entities";

function toEntity(snap: QueryDocumentSnapshot<DocumentData>): Entity {
  return { id: snap.id, ...(snap.data() as Omit<Entity, "id">) };
}

// Echtzeit-Abo auf alle Rechtsträger (alphabetisch nach Name).
export function subscribeEntities(
  onData: (entities: Entity[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), orderBy("name", "asc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(toEntity)),
    (err) => onError?.(err),
  );
}

export async function addEntity(input: EntityInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEntity(
  id: string,
  patch: Partial<EntityInput>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), patch);
}

export async function deleteEntity(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
