// Camada de persistência. Os jogos só falam com `storage`, nunca direto com o
// localStorage. Para trocar por um servidor, basta criar outro adaptador com a
// mesma interface assíncrona (load/save/remove/list) e exportá-lo aqui.

const PREFIX = 'pg:';

function getLocalStorage() {
  try {
    const ls = window.localStorage;
    const probe = '__pg_probe__';
    ls.setItem(probe, probe);
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export class LocalStorageAdapter {
  constructor(prefix = PREFIX) {
    this.prefix = prefix;
    this.ls = getLocalStorage();
    this.memory = new Map(); // fallback quando o localStorage está bloqueado
  }

  async load(key) {
    const raw = this.#read(this.prefix + key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async save(key, value) {
    this.#write(this.prefix + key, JSON.stringify(value));
  }

  async remove(key) {
    const full = this.prefix + key;
    this.memory.delete(full);
    try {
      this.ls?.removeItem(full);
    } catch {}
  }

  async list(prefix = '') {
    const full = this.prefix + prefix;
    const keys = new Set([...this.memory.keys()].filter((k) => k.startsWith(full)));
    if (this.ls) {
      for (let i = 0; i < this.ls.length; i++) {
        const k = this.ls.key(i);
        if (k?.startsWith(full)) keys.add(k);
      }
    }
    return [...keys].map((k) => k.slice(this.prefix.length));
  }

  #read(fullKey) {
    try {
      const v = this.ls?.getItem(fullKey);
      if (v != null) return v;
    } catch {}
    return this.memory.get(fullKey) ?? null;
  }

  #write(fullKey, raw) {
    this.memory.set(fullKey, raw);
    try {
      this.ls?.setItem(fullKey, raw);
    } catch {}
  }
}

export const storage = new LocalStorageAdapter();
