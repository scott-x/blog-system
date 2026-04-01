import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Tag {
  id: number;
  name: string;
  background?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  edges?: {
    tags?: Tag[];
  };
}

export interface CreatePostInput {
  title: string;
  content: string;
  tags: string[];
  thumbnail_url?: string;
}

export interface UpdatePostInput extends CreatePostInput {}

export interface CreateTagInput {
  name: string;
  background?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  page_size: number;
}

export interface GetPostsParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  tag?: string;
}

const API_BASE_URL = 'http://localhost:8080/api';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Post', 'Tag'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation<{ token: string }, LoginInput>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
    }),

    // Posts
    getPosts: builder.query<PostsResponse, GetPostsParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.page) searchParams.set('page', String(params.page));
          if (params.page_size) searchParams.set('page_size', String(params.page_size));
          if (params.keyword) searchParams.set('keyword', params.keyword);
          if (params.tag) searchParams.set('tag', params.tag);
        }
        const queryString = searchParams.toString();
        return queryString ? `/posts?${queryString}` : '/posts';
      },
      providesTags: ['Post'],
    }),
    getPost: builder.query<Post, number>({
      query: (id) => `/posts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Post', id }],
    }),
    createPost: builder.mutation<Post, CreatePostInput>({
      query: (body) => ({
        url: '/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Post'],
    }),
    updatePost: builder.mutation<Post, { id: number; data: UpdatePostInput }>({
      query: ({ id, data }) => ({
        url: `/posts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Post'],
    }),
    deletePost: builder.mutation<void, number>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Post'],
    }),

    // Tags
    getTags: builder.query<Tag[], void>({
      query: () => '/tags',
      providesTags: ['Tag'],
    }),
    createTag: builder.mutation<Tag, CreateTagInput>({
      query: (body) => ({
        url: '/tags',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tag'],
    }),
    deleteTag: builder.mutation<void, number>({
      query: (id) => ({
        url: `/tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tag', 'Post'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetPostsQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
} = api;
