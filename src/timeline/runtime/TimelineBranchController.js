import { asArray } from './TimelineRuntimeConfig.js';

export class TimelineBranchController {
  constructor() {
    this.activeBranchId = null;
    this.branchHistory = [];
  }

  setBranch(branchId, reason = 'manual') {
    const safeId = String(branchId || '').trim();
    this.activeBranchId = safeId || null;
    this.branchHistory.push({
      branchId: this.activeBranchId,
      reason,
      at: Date.now()
    });
    return this.activeBranchId;
  }

  filterItemsByBranch(items = []) {
    if (!this.activeBranchId) return asArray(items);
    return asArray(items).filter((item) => {
      const branch = String(item?.payload?.branch || item?.payload?.branchId || '').trim();
      return !branch || branch === this.activeBranchId;
    });
  }

  snapshot() {
    return {
      activeBranchId: this.activeBranchId,
      branchHistory: [...this.branchHistory]
    };
  }
}
