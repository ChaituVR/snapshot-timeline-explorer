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

export interface ProposalDetail {
  id: string;
  ipfs: string;
  author: string;
  created: number;
  updated: number;
  title: string;
  body: string;
  discussion: string;
  choices: string[];
  labels: string[];
  start: number;
  end: number;
  quorum: number;
  quorumType: string;
  privacy: string;
  snapshot: number;
  state: string;
  link: string;
  app: string;
  type: string;
  scores: number[];
  scores_state: string;
  scores_total: number;
  scores_updated: number;
  votes: number;
  flagged: boolean;
  space: {
    id: string;
    name: string;
    avatar: string;
  };
  network: string;
  symbol: string;
}

export interface VoteDetail {
  id: string;
  ipfs: string;
  voter: string;
  created: number;
  choice: number | number[] | Record<string, number>;
  reason: string;
  app: string;
  vp: number;
  vp_state: string;
}
