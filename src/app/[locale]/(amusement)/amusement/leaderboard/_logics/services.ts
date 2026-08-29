export const LeaderboardServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/leaderboard/`,
    params,
  }),

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/leaderboard/`,
    data: payload,
    params,
  }),

  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/leaderboard/${id}`,
    data: payload,
    params,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/leaderboard/${id}`,
  }),
}
