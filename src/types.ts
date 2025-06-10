export interface SnapshotMessage {
  id: string;
  mci: number;
  type: 'proposal' | 'settings' | 'delete-proposal' | 'update-proposal';
  ipfs: string;
  timestamp: number;
}

export interface SnapshotResponse {
  messages: SnapshotMessage[];
}