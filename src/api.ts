import { GraphQLClient, gql } from 'graphql-request';
import type { SnapshotResponse, ProposalDetail, VoteDetail } from './types';

const client = new GraphQLClient('https://hub.snapshot.org/graphql');

const MESSAGES_QUERY = gql`
  query GetMessages($space: String!, $first: Int!, $skip: Int!, $timestamp_lt: Int, $address: String) {
    messages(
      first: $first
      skip: $skip
      where: {
        space: $space
        timestamp_lt: $timestamp_lt
        address: $address
      }
      orderBy: "timestamp"
      orderDirection: desc
    ) {
      id
      mci
      type
      ipfs
      timestamp
      address
    }
  }
`;

export const fetchMessages = async (
  space: string,
  first: number = 10,
  skip: number = 0,
  timestamp_lt?: number,
  address?: string
): Promise<SnapshotResponse> => {
  return client.request(MESSAGES_QUERY, {
    space,
    first,
    skip,
    timestamp_lt,
    address,
  });
};

const ALL_MESSAGES_QUERY = gql`
  query GetAllMessages($first: Int!, $skip: Int!, $timestamp_lt: Int, $address: String) {
    messages(
      first: $first
      skip: $skip
      where: {
        timestamp_lt: $timestamp_lt
        address: $address
      }
      orderBy: "timestamp"
      orderDirection: desc
    ) {
      id
      mci
      type
      ipfs
      timestamp
      space
      address
    }
  }
`;

export const fetchAllMessages = async (
  first: number = 10,
  skip: number = 0,
  timestamp_lt?: number,
  address?: string
): Promise<SnapshotResponse> => {
  return client.request(ALL_MESSAGES_QUERY, {
    first,
    skip,
    timestamp_lt,
    address,
  });
};

export const fetchPreviousSettingsUpdate = async (
  space: string,
  currentTimestamp: number
): Promise<SnapshotResponse> => {
  const PREVIOUS_SETTINGS_QUERY = gql`
    query GetPreviousSettings($space: String!, $timestamp_lt: Int) {
      messages(
        first: 1
        where: {
          space: $space
          type: "settings"
          timestamp_lt: $timestamp_lt
        }
        orderBy: "timestamp"
        orderDirection: desc
      ) {
        id
        mci
        type
        ipfs
        timestamp
      }
    }
  `;

  return client.request(PREVIOUS_SETTINGS_QUERY, {
    space,
    timestamp_lt: currentTimestamp,
  });
};

const RANKING_QUERY = gql`
  query SearchSpaces($search: String!, $first: Int!) {
    ranking(first: $first, where: { search: $search }) {
      items {
        id
        name
        avatar
        followersCount
        votesCount
      }
    }
  }
`;

export const searchSpaces = async (
  search: string,
  first: number = 8
): Promise<{ ranking: { items: import('./types').SpaceResult[] } }> => {
  return client.request(RANKING_QUERY, { search, first });
};

export const fetchProposalById = async (
  space: string,
  proposalId: string
): Promise<SnapshotResponse> => {
  const PROPOSAL_QUERY = gql`
    query GetProposal($space: String!, $proposalId: String!) {
      messages(
        first: 10
        where: {
          space: $space
          id: $proposalId
          type_in: ["proposal", "update-proposal"]
        }
        orderBy: "timestamp"
        orderDirection: asc
      ) {
        id
        mci
        type
        ipfs
        timestamp
      }
    }
  `;

  return client.request(PROPOSAL_QUERY, {
    space,
    proposalId,
  });
};

// Fetch full proposal detail with title, body, choices, scores, votes count
export const fetchProposalDetail = async (
  proposalId: string
): Promise<{ proposal: ProposalDetail }> => {
  const PROPOSAL_DETAIL_QUERY = gql`
    query GetProposalDetail($id: String!) {
      proposal(id: $id) {
        id
        ipfs
        author
        created
        updated
        title
        body
        discussion
        choices
        labels
        start
        end
        quorum
        quorumType
        privacy
        snapshot
        state
        link
        app
        type
        scores
        scores_state
        scores_total
        scores_updated
        votes
        flagged
        space {
          id
          name
          avatar
        }
        network
        symbol
      }
    }
  `;

  return client.request(PROPOSAL_DETAIL_QUERY, { id: proposalId });
};

// Fetch votes for a proposal with pagination
export const fetchProposalVotes = async (
  proposalId: string,
  first: number = 20,
  skip: number = 0,
  orderBy: 'vp' | 'created' = 'vp',
  orderDirection: 'desc' | 'asc' = 'desc'
): Promise<{ votes: VoteDetail[] }> => {
  const VOTES_QUERY = gql`
    query GetVotes($proposalId: String!, $first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: OrderDirection!) {
      votes(
        first: $first
        skip: $skip
        where: { proposal: $proposalId }
        orderBy: $orderBy
        orderDirection: $orderDirection
      ) {
        id
        ipfs
        voter
        created
        choice
        reason
        app
        vp
        vp_state
      }
    }
  `;

  return client.request(VOTES_QUERY, {
    proposalId,
    first,
    skip,
    orderBy,
    orderDirection,
  });
};

export const fetchVotesByAddress = async (
  address: string,
  first: number = 20,
  skip: number = 0,
  created_lt?: number,
  space?: string
): Promise<{ votes: VoteDetail[] }> => {
  const ADDRESS_VOTES_QUERY = gql`
    query GetVotesByAddress($address: String!, $first: Int!, $skip: Int!, $created_lt: Int, $space: String) {
      votes(
        first: $first
        skip: $skip
        where: {
          voter: $address
          created_lt: $created_lt
          space: $space
        }
        orderBy: "created"
        orderDirection: desc
      ) {
        id
        ipfs
        voter
        created
        choice
        reason
        app
        vp
        vp_state
        proposal {
          id
          title
          space {
            id
            name
          }
        }
      }
    }
  `;

  return client.request(ADDRESS_VOTES_QUERY, {
    address,
    first,
    skip,
    created_lt,
    space,
  });
};

// Fetch all update-proposal messages for a given proposal ID to build revision history
export const fetchProposalHistory = async (
  space: string,
  proposalId: string
): Promise<SnapshotResponse> => {
  const HISTORY_QUERY = gql`
    query GetProposalHistory($space: String!, $proposalId: String!) {
      messages(
        first: 100
        where: {
          space: $space
          id: $proposalId
          type_in: ["proposal", "update-proposal"]
        }
        orderBy: "timestamp"
        orderDirection: asc
      ) {
        id
        mci
        type
        ipfs
        timestamp
      }
    }
  `;

  return client.request(HISTORY_QUERY, { space, proposalId });
};
