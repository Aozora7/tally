type Listener = () => void;

let listeners: Listener[] = [];

export function onDataMutated(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function notifyDataMutated(): void {
  for (const listener of listeners) {
    listener();
  }
}
