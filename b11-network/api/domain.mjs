export class DomainError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new DomainError(message, status);
};
const integer = (value, min = 0, max = 1000000) => {
  requireValue(Number.isSafeInteger(value) && value >= min && value <= max, 'Ungültige Zahl');
  return value;
};
const label = (value, max = 160) => {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Text erforderlich');
  return value.trim();
};
const categories = ['Werkzeug', 'Elektronik', 'Büro', 'Textil', 'Verpackung', 'Ersatzteile'];
export function seed(size = 48) {
  integer(size, 1, 100000);
  return {
    revision: 0, sequence: size + 100, orders: [], audit: [],
    customers: Array.from({ length: 12 }, (_, i) => ({ id: `c${i + 1}`, name: `Werkstatt ${i + 1}`, city: ['Berlin', 'Bremen', 'Köln'][i % 3] })),
    products: Array.from({ length: size }, (_, i) => ({ id: `p${i + 1}`, sku: `ART-${String(i + 1).padStart(6, '0')}`, name: `${categories[i % 6]} ${i + 1}`, category: categories[i % 6], price: 199 + i * 37 % 15000, stock: 20 + i % 80, minimum: 10, reserved: 0 })),
  };
}
export class Warehouse {
  constructor(state = seed()) { this.state = structuredClone(state); }
  snapshot({ query = '', category = '', page = 1, limit = 30 } = {}) {
    integer(page, 1); integer(limit, 1, 200);
    const s = this.state, search = String(query).toLocaleLowerCase('de');
    const filtered = s.products.filter(p => (!category || p.category === category) && `${p.name} ${p.sku}`.toLocaleLowerCase('de').includes(search));
    return {
      revision: s.revision, categories, customers: s.customers,
      products: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit,
      orders: s.orders.slice(-100).reverse(), audit: s.audit.slice(-100).reverse(),
      summary: this.summary(),
    };
  }
  summary() {
    const s = this.state;
    return { products: s.products.length, orders: s.orders.length,
      stockValue: s.products.reduce((sum, p) => sum + p.stock * p.price, 0),
      lowStock: s.products.filter(p => p.stock - p.reserved < p.minimum).length,
      revenue: s.orders.filter(o => o.status === 'shipped').reduce((sum, o) => sum + o.total, 0),
      byStatus: Object.fromEntries(['draft','reserved','shipped','cancelled','returned'].map(status => [status, s.orders.filter(o => o.status === status).length])) };
  }
  command(revision, action) {
    integer(revision);
    requireValue(revision === this.state.revision, 'Daten wurden inzwischen geändert', 409);
    requireValue(action && typeof action === 'object' && typeof action.type === 'string', 'Aktion fehlt');
    const before = structuredClone(this.state);
    try {
      const result = this.apply(action);
      this.state.revision++;
      this.state.audit.push({ id: this.state.revision, type: action.type, at: new Date().toISOString(), detail: result?.id ?? '' });
      return { result, ...this.snapshot() };
    } catch (error) { this.state = before; throw error; }
  }
  product(id) {
    const p = this.state.products.find(p => p.id === id);
    requireValue(p, 'Artikel nicht gefunden', 404); return p;
  }
  order(id) {
    const o = this.state.orders.find(o => o.id === id);
    requireValue(o, 'Auftrag nicht gefunden', 404); return o;
  }
  apply(a) {
    const s = this.state;
    switch (a.type) {
      case 'product.create': {
        const sku = label(a.sku, 40);
        requireValue(!s.products.some(p => p.sku === sku), 'Artikelnummer bereits vorhanden', 409);
        const p = { id: `p${++s.sequence}`, sku, name: label(a.name), category: label(a.category), price: integer(a.price), stock: integer(a.stock), minimum: integer(a.minimum ?? 10), reserved: 0 };
        s.products.push(p); return p;
      }
      case 'stock.receive': {
        const p = this.product(a.id); p.stock += integer(a.quantity, 1, 100000); return p;
      }
      case 'customer.create': {
        const c = { id: `c${++s.sequence}`, name: label(a.name), city: label(a.city) }; s.customers.push(c); return c;
      }
      case 'order.create': {
        requireValue(s.customers.some(c => c.id === a.customerId), 'Kunde nicht gefunden');
        requireValue(Array.isArray(a.lines) && a.lines.length > 0 && a.lines.length <= 100, '1–100 Positionen erforderlich');
        requireValue(new Set(a.lines.map(l => l.productId)).size === a.lines.length, 'Doppelte Position');
        const lines = a.lines.map(l => { const p = this.product(l.productId); return { productId: p.id, name: p.name, quantity: integer(l.quantity, 1, 10000), price: p.price }; });
        const o = { id: `o${++s.sequence}`, customerId: a.customerId, lines, total: lines.reduce((v, l) => v + l.price * l.quantity, 0), status: 'draft', note: a.note ? label(a.note, 2000) : '', created: new Date().toISOString() };
        s.orders.push(o); return o;
      }
      case 'order.reserve': {
        const o = this.order(a.id); requireValue(o.status === 'draft', 'Nur Entwürfe reservieren');
        for (const l of o.lines) { const p = this.product(l.productId); requireValue(p.stock - p.reserved >= l.quantity, `Bestand reicht nicht: ${p.name}`, 409); }
        for (const l of o.lines) this.product(l.productId).reserved += l.quantity;
        o.status = 'reserved'; return o;
      }
      case 'order.ship': {
        const o = this.order(a.id); requireValue(o.status === 'reserved', 'Erst reservieren');
        for (const l of o.lines) { const p = this.product(l.productId); p.stock -= l.quantity; p.reserved -= l.quantity; }
        o.status = 'shipped'; return o;
      }
      case 'order.cancel': {
        const o = this.order(a.id); requireValue(['draft', 'reserved'].includes(o.status), 'Auftrag bereits abgeschlossen');
        if (o.status === 'reserved') for (const l of o.lines) this.product(l.productId).reserved -= l.quantity;
        o.status = 'cancelled'; return o;
      }
      case 'order.return': {
        const o = this.order(a.id); requireValue(o.status === 'shipped', 'Nur versandte Aufträge retournieren');
        for (const l of o.lines) this.product(l.productId).stock += l.quantity;
        o.status = 'returned'; return o;
      }
      default: throw new DomainError('Unbekannte Aktion');
    }
  }
  export() { return structuredClone(this.state); }
  csv() {
    const cell = value => { let v = String(value); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replaceAll('"', '""') + '"'; };
    return [['SKU','Name','Bestand','Reserviert','Preis in Cent'], ...this.state.products.map(p => [p.sku,p.name,p.stock,p.reserved,p.price])].map(row => row.map(cell).join(';')).join('\r\n');
  }
}
