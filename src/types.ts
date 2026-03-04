export interface SnapshotMessage {
  id: string;
  mci: number;
  type: 'proposal' | 'settings' | 'delete-proposal' | 'update-proposal';
  ipfs: string;
  timestamp: number;
  space?: string;
}

export interface SnapshotResponse {
  messages: SnapshotMessage[];
}

export interface SpaceResult {
  id: string;
  name: string;
  avatar: string;
  followersCount: number;
  votesCount: number;
}