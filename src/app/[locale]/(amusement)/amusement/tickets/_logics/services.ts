export const TicketServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/tickets/`,
    params,
  }),

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/tickets/`,
    data: payload,
    params,
  }),

  Redeem: (id: number) => ({
    method: 'PATCH',
    url: `/tickets/${id}/redeem`,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/tickets/${id}`,
  }),
}
