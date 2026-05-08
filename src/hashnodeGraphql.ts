/**
 * Hashnode Public GraphQL API — https://gql.hashnode.com
 * Auth: `Authorization` header must be the raw Personal Access Token (not `Bearer`).
 * @see https://apidocs.hashnode.com/
 */

const HASHNODE_GQL_URL = 'https://gql.hashnode.com';

export type HashnodeGraphqlError = { message: string; extensions?: { code?: string } };

export type HashnodeGraphqlResponse<T> = {
  data?: T;
  errors?: HashnodeGraphqlError[];
};

export async function hashnodeGraphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  accessToken: string | undefined
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken?.trim()) {
    headers.Authorization = accessToken.trim();
  }

  const res = await fetch(HASHNODE_GQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let json: HashnodeGraphqlResponse<T>;
  try {
    json = JSON.parse(text) as HashnodeGraphqlResponse<T>;
  } catch {
    throw new Error(`Hashnode API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    const msg = json.errors?.map((e) => e.message).join('; ') || text.slice(0, 300);
    throw new Error(`Hashnode HTTP ${res.status}: ${msg}`);
  }

  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new Error(`Hashnode GraphQL: ${msg}`);
  }

  if (json.data === undefined || json.data === null) {
    throw new Error('Hashnode GraphQL: empty data');
  }

  return json.data;
}

export const PUBLICATION_BY_HOST_QUERY = `
  query PublicationByHost($host: String!) {
    publication(host: $host) {
      id
      title
      url
    }
  }
`;

export const PUBLISH_POST_MUTATION = `
  mutation PublishPost($input: PublishPostInput!) {
    publishPost(input: $input) {
      post {
        id
        title
        slug
        url
        canonicalUrl
        coverImage {
          url
        }
      }
    }
  }
`;

export const CREATE_DRAFT_MUTATION = `
  mutation CreateDraft($input: CreateDraftInput!) {
    createDraft(input: $input) {
      draft {
        id
        title
        slug
        coverImage {
          url
        }
      }
    }
  }
`;
