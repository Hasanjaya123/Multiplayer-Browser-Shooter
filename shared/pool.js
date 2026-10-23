// High-performance pre-allocated Object Pool to prevent GC pauses at 60+ FPS

export class ObjectPool {
  constructor(factoryFn, resetFn, initialSize = 128) {
    this.factoryFn = factoryFn;
    this.resetFn = resetFn;
    this.freeList = [];
    this.activeList = [];

    for (let i = 0; i < initialSize; i++) {
      const item = this.factoryFn();
      item._pooled = true;
      this.freeList.push(item);
    }
  }

  acquire(...args) {
    let item;
    if (this.freeList.length > 0) {
      item = this.freeList.pop();
    } else {
      item = this.factoryFn();
    }
    item._pooled = false;
    if (this.resetFn) {
      this.resetFn(item, ...args);
    }
    this.activeList.push(item);
    return item;
  }

  release(item) {
    if (item._pooled) return;
    item._pooled = true;
    const idx = this.activeList.indexOf(item);
    if (idx !== -1) {
      const last = this.activeList.pop();
      if (idx < this.activeList.length) {
        this.activeList[idx] = last;
      }
    }
    this.freeList.push(item);
  }

  releaseAt(index) {
    const item = this.activeList[index];
    if (!item) return;
    item._pooled = true;
    const last = this.activeList.pop();
    if (index < this.activeList.length) {
      this.activeList[index] = last;
    }
    this.freeList.push(item);
  }

  clear() {
    while (this.activeList.length > 0) {
      const item = this.activeList.pop();
      item._pooled = true;
      this.freeList.push(item);
    }
  }
}
