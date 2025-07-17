import { GraphQLClient, gql } from 'graphql-request';
import type { SnapshotResponse } from './types';

const client = new GraphQLClient('https://hub.snapshot.org/graphql');

const MESSAGES_QUERY = gql`
  query GetMessages($space: String!, $first: Int!, $skip: Int!, $timestamp_lt: Int) {
    messages(
      first: $first
      skip: $skip
      where: {
        space: $space
        type_in: ["proposal", "settings", "delete-proposal", "update-proposal"]
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

export const fetchMessages = async (
  space: string,
  first: number = 10,
  skip: number = 0,
  timestamp_lt?: number
): Promise<SnapshotResponse> => {
  return client.request(MESSAGES_QUERY, {
    space,
    first,
    skip,
    timestamp_lt,
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